import express from "express";
import * as dotenv from "dotenv";
dotenv.config();
import * as fs from "fs";
import * as path from "path";
import multer from "multer";
import cors from "cors";
import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const PORT = process.env.PORT || 3000;

const app = express();

app.disable('x-powered-by');

app.use(cors());

app.use(express.json({ limit: '128mb' }));

app.use(express.urlencoded({ limit: '128mb', extended: true }));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + Math.round(Math.random() * 1E12) + path.extname(file.originalname))
  }
})

const upload = multer({ storage });

const S3 = new S3Client({
  region: "us-west-002",
  endpoint: `https://s3.us-west-002.backblazeb2.com`,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
  signatureVersion: 'v4'
});

app.get('/', async (req, res) => {

  try {

    console.log(
      await S3.send(
        new ListBucketsCommand('')
      )
    );

    return res.json({ error: false, data: 'done' })

  } catch (error) {

    return res.json({ error: true, data: error.message })

  }

})

app.post('/listbuckets', async (req, res) => {

  try {

    const listBucketsData = await S3.send( new ListBucketsCommand(''));

    console.log(listBucketsData);

    return res.json({ error: false, data: listBucketsData })

  } catch (error) {

    return res.json({ error: true, data: error.message })

  }

})


app.post('/listobjectsv2', async (req, res) => {

  try {

    const listBbjectsV2Data = await S3.send( new ListObjectsV2Command({ Bucket: process.env.BUCKET }));

    console.log(listBbjectsV2Data);
    
    return res.json({ error: false, data: listBbjectsV2Data })

  } catch (error) {

    return res.json({ error: true, data: error.message })

  }

})

app.get('/getobject', async (req, res) => {

  try {

    const bucket = req.body.bucket;

    const key = req.body.key;
    
    const getObjectData = await S3.send( new GetObjectCommand({ Bucket: process.env.BUCKET, "Key": "1689286040924_195223592277.zip" }));
    
    const signedUrl = await getSignedUrl(S3, new GetObjectCommand({Bucket: process.env.BUCKET, "Key": "1689286040924_195223592277.zip"}), { expiresIn: 3600 });
    
	getObjectData.Body.pipe(res);
	
	//res.set("Content-Disposition", "inline;filename=1689286040924_195223592277.zip");
	//res.end();
	
    //return res.json({ error: false, data: signedUrl })

  } catch (error) {

    return res.json({ error: true, data: error.message })

  }

})

app.get('/getdownloadurl', async (req, res) => {

  const bucket = req.body.bucket ? req.body.bucket.trim() : process.env.BUCKET;

  const key = req.body.key ? req.body.key.trim() : process.env.KEY;

  try {

    const signedUrl = await getSignedUrl(S3, new GetObjectCommand({Bucket: bucket, Key: key}));

    console.log(signedUrl)

    return res.json({ error: false, data: signedUrl })

  } catch (error) {

    return res.json({ error: true, data: error.message })

  }

})

app.post('/upload', upload.single('attachment'), async (req, res) => {

  const bucket = req.body.bucket ? req.body.bucket.trim() : process.env.BUCKET;

  try {

    const params = {
      Bucket: bucket,
      Key: req.file.filename,
      Body: fs.createReadStream(req.file.path)
    };

    const putObjectData = await S3.send(new PutObjectCommand(params));
    
    console.log(putObjectData);

    return res.json({ error: false, data: 'putObjectData' })

  } catch (error) {

    return res.json({ error: true, data: error.message })

  }

})

app.all("*", (req, res) => {

  return res.json({ error: true, status: 404, data: "Api route not found!" });

});

app.listen(PORT, () => {

  console.log('app running at http://localhost:3000');

});