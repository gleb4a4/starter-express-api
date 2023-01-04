const express = require('express');
const cheerio = require('cheerio');
const axios = require('axios');
const app = express()
app.all('/', (req, res) => {
    console.log("Just got a request!")
    res.send('Yo!')
})
app.get('/get_chl',(req,res) =>{
    try{
        const url = req.params.url;
        let key = '';
        let game_id = '';
        let client_code = '';
        let jsonRes = {};
        axios
            .get(url)
            .then(response => {
                const html_data = response.data;
                const $ = cheerio.load(html_data);
                client_code = $('#scoreboard').data('league')
                game_id = url.replace(/[^0-9]+/g, "");
                key = $('#scoreboard').data('feed_key')
            })
            .catch(err => console.log(err))
        axios
            .get(`https://cluster.leaguestat.com/feed/index.php?feed=gc&key=${key}&client_code=${client_code}&game_id=${game_id}&lang_code=en&fmt=json&tab=gamesummary`)
            .then(response => jsonRes = response.data.GC.Gamesummary)
            .catch(err => console.log(err))
        return res.status(200).json({
            ...jsonRes
        })
    }catch (err) {
        return res.status(500).json({
            err: err.toString(),
        });
    }
})
app.listen(process.env.PORT || 3000)