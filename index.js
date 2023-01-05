const express = require('express');
const cheerio = require('cheerio');
const axios = require('axios');
const cors = require('cors');
const app = express()
app.use(cors({
    origin: '*'
}));
app.all('/', (req, res) => {
    console.log("Just got a request!")
    res.send('Yo!')
})
app.get('/get_chl',async (req,res) =>{
    try{
        const url = req.query.url;
        let key = '';
        let game_id = '';
        let client_code = '';
        let jsonRes = {};
        await axios
            .get(url)
            .then(response => {
                const html_data = response.data;
                const $ = cheerio.load(html_data);
                client_code = $('#scoreboard').data('league')
                game_id = url.replace(/[^0-9]+/g, "");
                key = $('#scoreboard').data('feed_key')
            })
            .catch(err => console.log(err))
       await axios
            .get(`https://cluster.leaguestat.com/feed/index.php?feed=gc&key=${key}&client_code=${client_code}&game_id=${game_id}&lang_code=en&fmt=json&tab=gamesummary`)
            .then(response => {
                jsonRes = response.data.GC.Gamesummary
            })
            .catch(err => console.log(err))
        return res.status(200).json({
            home: {
                team_id: parseInt(jsonRes.home.id),
                team_name: jsonRes.home.name,
                shots_on_goal: jsonRes.totalShots.home,
                shots: jsonRes.totalShots.home,
                blocked_shots: 0,
                goals: jsonRes.goalCount.home,
            },
            away: {
                team_id: parseInt(jsonRes.visitor.id),
                team_name: jsonRes.visitor.name,
                shots_on_goal: jsonRes.totalShots.visitor,
                shots: jsonRes.totalShots.visitor,
                blocked_shots: 0,
                goals: jsonRes.goalCount.visitor,
            },
        })
    }catch (err) {
        return res.status(500).json({
            err: err.toString(),
        });
    }
})
app.listen(process.env.PORT || 3000)