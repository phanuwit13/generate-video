const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const puppeteer = require('puppeteer');
const multer = require('multer');
const AdmZip = require('adm-zip');

const execPromise = promisify(exec);

const app = express();
const port = 8080;

app.use(express.json());
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin,X-Requested-With,Content-Type,Accept, x-access-token, x-refresg-token,_id,Authorization'
  )
  res.header('Access-Control-Expose-Headers', 'x-access-token, x-refresg-token')
  next();
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/convert', upload.single('FileData'), async (req, res) => {
  try {
    const uploadedFile = req.file;
    const width = Number(req.body.width);
    const height = Number(req.body.height);
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const tempLocation = await fs.mkdtemp('temp-');
    const tempDir = path.join(__dirname, tempLocation);
    await fs.mkdir(tempDir, { recursive: true });

    const zipPath = path.join(tempDir, 'animation.zip');
    await fs.writeFile(zipPath, uploadedFile.buffer);

    const extractPath = path.join(tempDir, 'animation');
    await fs.mkdir(extractPath, { recursive: true });

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const htmlPath = path.join(extractPath, 'index.html')
    const cssPath = path.join(extractPath, 'style.css')
    console.log('`file://${htmlPath}`', `file://${htmlPath}`)
    await page.goto(`file://${htmlPath}`)
    await page.addStyleTag({ path: cssPath })
    await page.setViewport({ width, height });

    const numFrames = 30; // 60 fps * 1 second
    const second = 10; // 60 fps * 1 second
    
    const screenshots = [];
    for (let i = 0; i < numFrames * second; i++) {
      const screenshotPath = path.join(tempDir, `screenshot_${i}.png`);
      await page.screenshot({
        path: screenshotPath,
        // clip: { x: 0, y: 0, width: width, height: height },
      });
      screenshots.push(screenshotPath);
      console.log('numFrames', i);
    }

    await browser.close();

    const outputVideoPath = path.join(tempDir, 'output.mp4');
    const ffmpegCmd = `ffmpeg -framerate ${numFrames} -i ${tempDir}/screenshot_%d.png -filter:v "minterpolate='mi_mode=mci:mc_mode=aobmc:vsbmc=1:fps=${numFrames}'" -c:v libx264 -r ${numFrames} -pix_fmt yuv420p -s ${width}x${height} ${outputVideoPath}`;

    await execPromise(ffmpegCmd);

    console.log('Video conversion successful');

    res.sendFile(outputVideoPath, async () => {
      // await fs.unlink(outputVideoPath);
      // await fs.rm(tempDir, { recursive: true });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
