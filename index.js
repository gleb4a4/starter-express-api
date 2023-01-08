const express = require('express');
const cheerio = require('cheerio');
const axios = require('axios');
const cors = require('cors');
const path = require("path");
const app = express()
app.use(cors({
    origin: '*'
}));
app.all('/', (req, res) => {
    console.log("Just got a request!")
    res.sendFile(path.join(__dirname, '/test.html'));
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
app.get('/get_ahl',async (req,res)=>{
    const form = {
        home: {
            team_name: '',
            shots_on_goal: 0,
            blocked_shots: 0,
            shots: 0,
            goals: 0
        },
        away: {
            team_name: '',
            shots_on_goal: 0,
            blocked_shots: 0,
            shots: 0,
            goals: 0
        }
    }
    try{
        const url = req.query.url;
        const game_id = url.replace(/[^0-9]+/g, "");
       await axios.get(`https://lscluster.hockeytech.com/game_reports/official-game-report.php?client_code=ahl&game_id=${game_id}&lang_id=1`)
           .then(response => {
            const $ = cheerio.load(response.data)
           $('td[width="240"] > table > tbody > tr').each(function(iteration,elem){
               if (iteration == 1) {
                   form.away.team_name = $(elem).find('td[align="left"]').text()
                   form.away.goals = parseInt($(elem).find('td[align="center"]').last().text())

               }
               if (iteration == 2) {
                   form.home.team_name = $(elem).find('td[align="left"]').text()
                   form.home.goals =  parseInt($(elem).find('td[align="center"]').last().text())
               }
               if (iteration == 4) {
                   form.away.shots =  parseInt($(elem).find('td[align="center"]').last().text())
                   form.away.shots_on_goal = form.away.shots
               }
               if (iteration == 5) {
                   form.home.shots =  parseInt($(elem).find('td[align="center"]').last().text())
                   form.home.shots_on_goal = form.home.shots
               }
           }).get()
        })
        return res.status(200).json({
            ...form
        })
    }catch (err) {
        return res.status(500).json({
            err: err.toString(),
        });
    }
})
app.get('/get_mhl', async (req,res)=>{
    const form = {
        home: {
            team_name: '',
            shots: 0,
            shots_on_goal: 0,
            blocked_shots: 0,
            goals: 0
        },
        away: {
            team_name: '',
            shots: 0,
            shots_on_goal: 0,
            blocked_shots: 0,
            goals: 0
        }
    }
    try {
        const url = req.query.url;
        const game_id = url.replace(/[^0-9]+/g, "");
       await axios.get(`http://text.mhl.khl.ru/${game_id}`+'.html')
            .then(response => {
                const $ = cheerio.load(response.data)
                 $('.game_info_team > .game_info_team_info > .game_info_team_name').each((iteration,elem) =>{
                     if (iteration == 0) {
                         form.home.team_name = $(elem).text().trim()
                     }else {
                         form.away.team_name = $(elem).text().trim()
                     }
                });
                $('.game_info_team .game_info_team-right > .game_info_team_info > .game_info_team_name').text().trim();
                const actionText = $('.e-action_txt').text()
                const splitActionText = actionText.split(';')
                splitActionText.length = 5
                splitActionText.forEach((item,index) => {
                    if (index == 0){
                        const splitItem = item.split('-');
                        splitItem.forEach((value,index) => {
                            if (index == 0){
                                form.home.shots = parseInt(value.replace(/[^0-9]+/g, ""));
                            }
                            if (index == 1){
                                form.away.shots = parseInt(value.replace(/[^0-9]+/g, ""));
                            }
                        })
                    }
                    if (index == 1){
                        const splitItem = item.split('-');
                        splitItem.forEach((value,index) => {
                            if (index == 0){
                                form.home.shots_on_goal = parseInt(value.replace(/[^0-9]+/g, ""));
                            }
                            if (index == 1){
                                form.away.shots_on_goal = parseInt(value.replace(/[^0-9]+/g, ""));
                            }
                        })
                    }
                    if (index == 2){
                        const splitItem = item.split('-');
                        splitItem.forEach((value,index) => {
                            if (index == 0){
                                form.home.goals = parseInt(value.replace(/[^0-9]+/g, ""));
                            }
                            if (index == 1){
                                form.away.goals = parseInt(value.replace(/[^0-9]+/g, ""));
                            }
                        })
                    }
                    if (index == 4){
                        const splitItem = item.split('-');
                        splitItem.forEach((value,index) => {
                            if (index == 0){
                                form.home.blocked_shots = parseInt(value.replace(/[^0-9]+/g, ""));
                            }
                            if (index == 1){
                                form.away.blocked_shots = parseInt(value.replace(/[^0-9]+/g, ""));
                            }
                        })
                    }
                })
            })
            .catch(err => err)
    return res.status(200).json({
        ...form
    })
    }catch (err) {
        return res.status(500).json({
            err: err.toString(),
        });
    }

})
app.get('/get_chanceLeague', async (req,res)=>{
    const form = {
        home: {
            team_name: '',
            shots: 0,
            shots_on_goal: 0,
            blocked_shots: 0,
            goals: 0
        },
        away: {
            team_name: '',
            shots: 0,
            shots_on_goal: 0,
            blocked_shots: 0,
            goals: 0
        }
    }
    try {
        const url = req.query.url;
        const game_id = url.replace(/[^0-9]+/g, "");
        let api_id = '';
        let season = '';
        await axios.get(`https://www.hokej.cz/zapas/${game_id}/stats`)
            .then(response => {
                const $ = cheerio.load(response.data)
                form.home.team_name =  $('.team-home > a > h2.medium').text()
                form.away.team_name =  $('.team-visiting > a > h2.medium').text()
                $('script[type="text/javascript"]').each((iteration,elem)=>{
                    if (iteration == 4){
                        $(elem).text().split(':').forEach((value,index)=>{
                            if (index == 2){
                                season = value.replace(/[^0-9]+/g, "");
                            }
                            if (index == 3){
                                api_id = value.replace(/[^0-9]+/g, "");
                            }
                        })
                    }
                })
            }).catch(err => err)
        await axios.get(`https://s3-eu-west-1.amazonaws.com/data.onlajny.com/hockey/summary/${season}/${api_id}.json`)
            .then(response => {
                const json = response.data;
                form.home.goals = parseInt(json.home.goals.total)
                form.home.shots_on_goal = parseInt(json.home.shots.total)
                form.home.blocked_shots = parseInt(json.home.blocked_shots.total)
                const missed_shot_home = parseInt(json.home.missed_shots.total)
                const missed_shot_away = parseInt(json.visitor.missed_shots.total)
                form.away.goals = parseInt(json.visitor.goals.total)
                form.away.shots_on_goal = parseInt(json.visitor.shots.total)
                form.away.blocked_shots = parseInt(json.visitor.blocked_shots.total)
                form.home.shots = form.home.shots_on_goal + missed_shot_home + form.away.blocked_shots
                form.away.shots = form.away.shots_on_goal + missed_shot_away + form.home.blocked_shots
            })
        return res.status(200).json({
            ...form
        })
    }catch (err) {
        return res.status(500).json({
            err: err.toString(),
        });
    }

})
app.get('/get_nla', async (req,res)=>{
    const form = {
        home: {
            team_name: '',
            shots: 0,
            xg:0,
            shots_on_goal: 0,
            blocked_shots: 0,
            goals: 0
        },
        away: {
            team_name: '',
            shots: 0,
            xg:0,
            shots_on_goal: 0,
            blocked_shots: 0,
            goals: 0
        }
    }
    try {
        const url = req.query.url;
        const game_id = url.replace(/[^0-9]+/g, "");
        await axios.get(`https://www.nationalleague.ch/api/games/${game_id}?lang=de-CH`)
            .then(response => {
                const { overview, shotsAway, shotsHome, teamStatsHome, teamStatsAway } = response.data
                form.home.team_name = overview.homeTeamShortName;
                form.away.team_name =  overview.awayTeamShortName;
                form.home.shots = shotsHome.length;
                form.away.shots = shotsAway.length;
                form.home.xg = shotsHome.pop().xgSum;
                form.away.xg = shotsAway.pop().xgSum;
                form.home.shots_on_goal = teamStatsAway.sa;
                form.away.shots_on_goal = teamStatsHome.sa;
                form.home.blocked_shots = teamStatsHome.bks;
                form.away.blocked_shots = teamStatsAway.bks;
            }).catch(err => err)

        return res.status(200).json({
            ...form
        })
    }catch (err) {
        return res.status(500).json({
            err: err.toString(),
        });
    }

})
app.listen(process.env.PORT || 3000)