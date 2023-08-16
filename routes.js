const express = require('express')
const route = express.Router()
const multer = require('multer')
const video = require('./controllers/video')

module.exports = route

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

route.post('/convert', upload.single('FileData'), video.generateVideo())