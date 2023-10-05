import express from "express";
import * as dotenv from "dotenv";
dotenv.config();
import * as fs from "fs";
import * as path from "path";
import multer from "multer";
import cors from "cors";

import {renderFile} from 'ejs'
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
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('./public'));

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
  region: "us-west-2",
  endpoint: `https://i3h3.or.idrivee2-41.com`,
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

    return res.render('account')

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

    if(req.query.file && req.query.file == '') {

      const file = req.query.file;
      console.log(file)
    }

    const bucket = req.body.bucket;

    const key = req.body.key;
    
    const getObjectData = await S3.send( new GetObjectCommand({ Bucket: process.env.BUCKET, "Key": "689286040924_195223592277.zip" }));
    
    const signedUrl = await getSignedUrl(S3, new GetObjectCommand({Bucket: process.env.BUCKET, "Key": "1689286040924_195223592277.zip"}), { expiresIn: 3600 });
    
	getObjectData.Body.pipe(res);
	
	//res.set("Content-Disposition", "inline;filename=1689286040924_195223592277.zip");
	//res.end();
	
    //return res.json({ error: false, data: signedUrl })

  } catch (error) {
    console.log(error?.$metadata)
if(error?.$metadata?.httpStatusCode == 404) {

  return res.status(404).send("<p>file not found!</p>")

}
    
return res.send("<p>Unable to download file!</p>")
  }

})

app.get('/getdownloadurl', async (req, res) => {

  const bucket = req.body.bucket ? req.body.bucket.trim() : process.env.BUCKET;

  const key = req.body.key ? req.body.key.trim() : process.env.KEY;

  try {

    const signedUrl = await getSignedUrl(S3, new PutObjectCommand({Bucket: process.env.BUCKET, "Key": "1689286040924_195223592277.zip"}), { expiresIn: 3600 });

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
      Body: fs.createReadStream(req.file.path),
      ACL: 'public-read'
    };

    const putObjectData = await S3.send(new PutObjectCommand(params));
    
    console.log(putObjectData);

    return res.json({ error: false, data: putObjectData })

  } catch (error) {

    return res.json({ error: true, data: error.message })

  }

})




app.get('/sign-s3', async (req, res) => {

  const fileName = req.query['file-name'];
  //const fileType = req.query['file-type'];

  console.log(fileName)

  const signedUrl = await getSignedUrl(S3, new PutObjectCommand({Bucket: process.env.BUCKET, "Key": fileName }), { expiresIn: 3600 });

  return res.json({url: signedUrl});

});

app.all("*", (req, res) => {

  return res.json({ error: true, status: 404, data: "Api route not found!" });

});

app.listen(PORT, () => {

  console.log('app running at http://localhost:3000');

});