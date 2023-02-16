require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const dns = require("dns");

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }))
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

//MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Database connection successful')
  })
  .catch(err => {
    console.error('Database connection error')
  });

let shorterSchema = new mongoose.Schema({
  original_url: { type: String, required: true, unique: true, dropDups: true }
  //using auto-generated _id as short_url value
});

let URLshortener = mongoose.model('urls', shorterSchema);

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});
app.get('/api/shorturl/:short_id?', function (req, res) {
  const short_id = req.params.short_id;
  //search db for short_id with the matching _id value
  URLshortener.findOne({ _id: short_id }, function(err, data){
    if(err){return res.json({ error: "invalid short url" })}
    let url = data.original_url;
    res.redirect(url);
  })
})
app.post('/api/shorturl', async function (req, res) {
  const url = req.body.url;
  const hostname = (new URL(req.body.url)).hostname;
  console.log("url: ", url)
  //check if url is valid
  dns.lookup(hostname, (err, address, family) => {
    console.log("e: ", err, "a: ", address, " f: ", family)
    if(err){ res.json({ error: 'invalid url' })}
    if(address && family){
      //truthy --> has value --> was resolved successfully
    }
  })

  //Save the valid url, will not store duplicates, if already exists it will return stored document
  let newURL = new URLshortener({ original_url: url })
  await newURL.save(function (err, data) {
    if (err) { return console.log(err) }
    console.log("Add to DB: " + data)
  })

  await URLshortener.findOne({ original_url: url }, function(err, data){
    if(err){return console.log(err)}
    //recreate the json doc with _id as short_url
    res.json({ original_url: data.original_url, short_url: data._id })
  })

})
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
