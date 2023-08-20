const fs = require('fs').promises
const path = require('path')
const puppeteer = require('puppeteer')
const AdmZip = require('adm-zip')
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder')

exports.generateVideo = (req, res, next) => {
  return async (req, res, next) => {
    try {
      const width = Number(req.body.width)
      const height = Number(req.body.height)
      const Config = {
        followNewTab: true,
        fps: 60,
        videoFrame: {
          width,
          height,
        },
        videoCrf: 18,
        videoCodec: 'libx264',
        videoPreset: 'ultrafast',
        videoBitrate: 1400000,
        aspectRatio: `${width}:${height}`,
        recordDurationLimit: 10,
      }
      const uploadedFile = req.file
      if (!uploadedFile) {
        return res.status(400).json({ message: 'No file uploaded' })
      }
      await fs.mkdir(path.join(__dirname, '..', 'video'), { recursive: true })
      const tempLocation = await fs.mkdtemp(
        path.join(__dirname, '..', 'video', 'temp-')
      )
      await fs.mkdir(tempLocation, { recursive: true })

      const zipPath = path.join(tempLocation, 'animation.zip')
      await fs.writeFile(zipPath, uploadedFile.buffer)

      const extractPath = path.join(tempLocation, 'animation')
      await fs.mkdir(extractPath, { recursive: true })

      const zip = new AdmZip(zipPath)
      zip.extractAllTo(extractPath, true)

      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      const page = await browser.newPage()
      const htmlPath = path.join(extractPath, 'index.html')
      const cssPath = path.join(extractPath, 'style.css')
      await page.goto(`file://${htmlPath}`)
      await page.setViewport({ width, height })
      await page.addStyleTag({ path: cssPath })

      const recorder = new PuppeteerScreenRecorder(page, Config)
      await recorder.start(path.join(tempLocation, 'output.mp4'))

      const recordingDuration = 10000 // 10 seconds
      await page.waitForTimeout(recordingDuration)

      await recorder.stop()
      await browser.close()

      const outputVideoPath = path.join(tempLocation, 'output.mp4')
      res.sendFile(outputVideoPath, async () => {
        await fs.unlink(outputVideoPath)
        await fs.rm(tempLocation, { recursive: true })
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ message: 'Server error' })
    }
  }
}
