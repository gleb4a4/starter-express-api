const express = require('express');
const cheerio = require('cheerio');
const axios = require('axios');
const app = express()
app.all('/', (req, res) => {
    console.log("Just got a request!")
    res.send('Yo!')
})
app.post('/get_chl/:url',(req,res) =>{
    console.log(req,res)
    axios
        .get('https://whl.ca/gamecentre/1018986/boxscore')
        .then(response => console.log(response.data))
        .catch(err => console.log(err))
})
app.listen(process.env.PORT || 3000)