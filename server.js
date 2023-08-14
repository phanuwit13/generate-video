const express = require('express')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const puppeteer = require('puppeteer')
const multer = require('multer')
const AdmZip = require('adm-zip')

const app = express()
const port = 8080

app.use(express.json())
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin,X-Requested-With,Content-Type,Accept, x-access-token, x-refresg-token,_id,Authorization'
  )
  res.header('Access-Control-Expose-Headers', 'x-access-token, x-refresg-token')
  next()
})

// Configure multer for file upload
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

app.post('/convert', upload.single('FileData'), async (req, res) => {
  try {
    const uploadedFile = req.file
    const width = Number(req.body.width) // Adjust this value to the desired width
    const height = Number(req.body.height) // Adjust this value to the desired height
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Create a temporary directory to extract ZIP content
    const tempLocation = await fs.promises.mkdtemp('temp-')
    const tempDir = path.join(__dirname, tempLocation)
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir)
    }

    // Write uploaded ZIP file to disk
    const zipPath = path.join(tempDir, 'animation.zip')
    fs.writeFileSync(zipPath, uploadedFile.buffer)

    // Extract ZIP file
    const extractPath = path.join(tempDir, 'animation')
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath)
    }

    const zip = new AdmZip(zipPath)
    zip.extractAllTo(extractPath, true)

    // Launch Puppeteer
    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    // Load HTML and CSS
    const htmlPath = path.join(extractPath, 'index.html')
    const cssPath = path.join(extractPath, 'style.css')
    console.log('`file://${htmlPath}`', `file://${htmlPath}`)
    await page.goto(`file://${htmlPath}`)
    await page.addStyleTag({ path: cssPath })
    await page.setViewport({ width, height })

    // Capture screenshots at 60 fps for 1 second
    const numFrames = 30 // 60 fps * 1 second
    const second = 10 // 60 fps * 1 second
    const screenshots = []
    for (let i = 0; i < numFrames * second; i++) {
      const screenshotPath = path.join(tempDir, `screenshot_${i}.png`)
      await page.screenshot({
        path: screenshotPath,
        // clip: { x: 0, y: 0, width: width, height: height },
      })
      screenshots.push(screenshotPath)
      console.log('numFrames', i)
    }

    // Close the browser
    await browser.close()

    // Use FFmpeg to create video from screenshots
    const outputVideoPath = path.join(tempDir, 'output.mp4')
    const ffmpegCmd = `ffmpeg -framerate ${numFrames} -i ${tempDir}/screenshot_%d.png -filter:v "minterpolate='mi_mode=mci:mc_mode=aobmc:vsbmc=1:fps=${numFrames}'" -c:v libx264 -r ${numFrames} -pix_fmt yuv420p -s ${width}x${height} ${outputVideoPath}`

    exec(ffmpegCmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`FFmpeg error: ${error}`)
        return res.status(500).json({ error: 'Video conversion failed' })
      }

      console.log('Video conversion successful')
      res.sendFile(outputVideoPath, {}, () => {
        // Clean up temporary files
        fs.unlinkSync(outputVideoPath)
        fs.rmdirSync(tempDir, { recursive: true })
      })
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
