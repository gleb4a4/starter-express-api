import express from 'express'
import cheerio from 'cheerio';
import axios from 'axios';
import cors from 'cors'
const app = express()
import {checkPeriodsTime, getCurrentDate} from "./helpers.js";
import {BLOCKED_SHOT, SHOT, GOAL, MISSED_SHOT, PERIOD_END, CHALLENGE, PENALTY, STOP} from "./constants.js";
import AWS from 'aws-sdk';
import * as fs from "fs";
const s3 = new AWS.S3()
app.use(cors({
    origin: '*'
}));
app.all('/', (req, res) => {
    console.log("Just got a request!")
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
                form.home.goals =  teamStatsAway.ga;
                form.away.goals =  teamStatsHome.ga;
                form.home.shots = shotsHome.length;
                form.away.shots = shotsAway.length;
                form.home.xg = shotsHome.pop().xgSum;
                form.away.xg = shotsAway.pop().xgSum;
                form.home.shots_on_goal = teamStatsHome.sog1 + teamStatsHome.sog2 + teamStatsHome.sog3 + teamStatsHome.sogOt;
                form.away.shots_on_goal = teamStatsAway.sog1 + teamStatsAway.sog2 + teamStatsAway.sog3 + teamStatsAway.sogOt;
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
app.get('/get_nhl_matches_all', async (req,res) => {
    const currentDate = getCurrentDate();
    console.log(currentDate);
    try {
        const { data } = await axios.get(`https://statsapi.web.nhl.com/api/v1/schedule?expand=schedule.brodcasts&startDate=2022-10-10&endDate=${currentDate}`)
        const games = {}
        data.dates.forEach(item => {
            item.games.forEach(game => {
                games[game.gamePk] = {}
                games[game.gamePk]['game_id'] = game.gamePk
                games[game.gamePk]['video_review'] = 0;
                games[game.gamePk]['home_team'] = {
                    ...game.teams.home.team,
                    score: 0
                }
                games[game.gamePk]['away_team'] = {
                    ...game.teams.away.team,
                    score: 0
                }
            })
        })
        await s3.putObject({
            Body: JSON.stringify(games),
            Bucket: "cyclic-fine-tan-snapper-ring-eu-west-1",
            Key: `nhl_games_${currentDate}.json`,
        }).promise()
        return res.status(200).json({
            ...games
        })
    }catch (err) {
        return res.status(500).json({
            err: err.toString(),
        });
    }
})
// app.get('/get_nhl_goalies_by_match', async (req,res) => {
//     try {
//         let json = null
//         fs.readFile('allgamesNHL.json', 'utf8', async function readFileCallback(err, nhlGames){
//             if (err){
//                 console.log(err);
//             } else {
//                 let obj = JSON.parse(nhlGames); //now it an object
//                 for (const [key, _] of Object.entries(obj)) {
//                     console.log(key)
//                     const { data } = await axios.get(`https://statsapi.web.nhl.com/api/v1/game/${key}/feed/live`)
//                     obj[key]['home_team']['goalie'] = {}
//                     obj[key]['away_team']['goalie'] = {}
//                     const home_team_id = obj[key]['home_team']['id']
//                     const away_team_id = obj[key]['away_team']['id']
//                     const players = data.gameData.players;
//                     for (const [_, value] of Object.entries(players)) {
//                         if (value.primaryPosition.type === 'Goalie') {
//                             if (home_team_id === value.currentTeam.id) {
//                                 obj[key]['home_team']['goalie'][value.id] = {
//                                     'first_name': value.firstName,
//                                     'last_name' : value.lastName,
//                                     'full_name' : value.fullName
//                                 }
//                             }
//                             if (away_team_id === value.currentTeam.id) {
//                                 obj[key]['away_team']['goalie'][value.id] = {
//                                     'first_name': value.firstName,
//                                     'last_name': value.lastName,
//                                     'full_name': value.fullName
//                                 }
//                             }
//                         }
//                     }
//                 }
//                 //save
//                 json = JSON.stringify(obj); //convert it back to json
//                 fs.writeFile('allgamesNHL.json', json, 'utf8', ()=>{}); // write it back
//             }
//         });
//         return res.status(200).json({
//             ...JSON.parse(json)
//         })
//     }catch (err) {
//         return res.status(500).json({
//             err: err.toString(),
//         });
//     }
// })
app.get('/get_nhl_events_match', async (req,res) => {
    const currentDate = getCurrentDate();
    try {
        let json = null
        let nhl_games = await s3.getObject({
            Bucket: "cyclic-fine-tan-snapper-ring-eu-west-1",
            Key: `nhl_games_${currentDate}.json`,
        }).promise()

                let obj = JSON.parse(nhl_games.Body.toString('utf-8'))
                for (const [key, _] of Object.entries(obj)) {
                    const { data } = await axios.get(`https://statsapi.web.nhl.com/api/v1/game/${key}/feed/live`)
                    const home_team_id = obj[key]['home_team']['id']
                    const away_team_id = obj[key]['away_team']['id']
                    obj[key]['home_team']['stats'] = {
                        firstPeriod: {
                            '0.5M':0,
                            '1.5Б':0,
                            'draw':0,
                        },
                        goals: 0,
                        goalsInterval: {
                            10: 0,
                            20: 0,
                            30: 0,
                            40: 0,
                            50: 0,
                            55: 0,
                            60: 0
                        },
                        firstPenalty: {
                            type:'',
                            score: 0
                        },
                        blocked_shots: 0,
                        shots: 0,
                        shots_on_goal: 0,
                        empty_goals: 0,
                    }
                    obj[key]['away_team']['stats'] = {
                        firstPeriod: {
                            '0.5M':0,
                            '1.5Б':0,
                            'draw':0,
                        },
                        goals: 0,
                        goalsInterval: {
                            10: 0,
                            20: 0,
                            30: 0,
                            40: 0,
                            50: 0,
                            55: 0,
                            60: 0
                        },
                        firstPenalty: {
                            type:'',
                            score: 0
                        },
                        blocked_shots: 0,
                        shots: 0,
                        shots_on_goal: 0,
                        empty_goals: 0,
                    }
                    const allEvents = data.liveData.plays.allPlays;
                    allEvents.forEach(item => {
                        if (item.result.eventTypeId === PERIOD_END && item.about.period === 1) {
                            let PeriodGoals = 0;
                            PeriodGoals += item.about.goals.away
                            PeriodGoals += item.about.goals.home
                            if (PeriodGoals === 0) {
                                obj[key]['home_team']['stats']['firstPeriod']['draw'] += 1;
                                obj[key]['away_team']['stats']['firstPeriod']['draw'] += 1;
                                obj[key]['home_team']['stats']['firstPeriod']['0.5M'] += 1;
                                obj[key]['away_team']['stats']['firstPeriod']['0.5M'] += 1;
                            }
                            if (PeriodGoals >= 2) {
                                obj[key]['home_team']['stats']['firstPeriod']['1.5Б'] += 1;
                                obj[key]['away_team']['stats']['firstPeriod']['1.5Б'] += 1;
                                if (item.about.goals.away === item.about.goals.home) {
                                    obj[key]['home_team']['stats']['firstPeriod']['draw'] += 1;
                                    obj[key]['away_team']['stats']['firstPeriod']['draw'] += 1;
                                }
                            }
                        }
                        if (item.result.eventTypeId === PENALTY) {
                            if (home_team_id === item.team.id && obj[key]['home_team']['stats'].firstPenalty.score === 0) {
                                obj[key]['home_team']['stats'].firstPenalty.type = item.result.secondaryType
                                obj[key]['home_team']['stats'].firstPenalty.score += 1
                            }
                            if (away_team_id === item.team.id &&  obj[key]['away_team']['stats'].firstPenalty.score === 0) {
                                obj[key]['away_team']['stats'].firstPenalty.type = item.result.secondaryType
                                obj[key]['away_team']['stats'].firstPenalty.score += 1
                            }
                        }
                        if (item.result.eventTypeId === GOAL) {
                            const time = item.about.periodTime;
                            const splitTime = time.split(':');
                            const minutes = parseInt(splitTime[0]);
                            if (home_team_id === item.team.id) {
                                if (item.about.period === 1) {
                                    if (minutes < 10) {
                                        obj[key]['home_team']['stats'].goalsInterval[10] += 1
                                    }
                                    if (minutes >= 10) {
                                        obj[key]['home_team']['stats'].goalsInterval[20] += 1
                                    }
                                }
                                if (item.about.period === 2) {
                                    if (minutes < 10) {
                                        obj[key]['home_team']['stats'].goalsInterval[30] += 1
                                    }
                                    if (minutes >= 10) {
                                        obj[key]['home_team']['stats'].goalsInterval[40] += 1
                                    }
                                }
                                if (item.about.period === 3) {
                                    if (minutes < 10) {
                                        obj[key]['home_team']['stats'].goalsInterval[50] += 1
                                    }
                                    if (minutes >= 10 && minutes < 15) {
                                        obj[key]['home_team']['stats'].goalsInterval[55] += 1
                                    }
                                    if (minutes >= 15 && !item.result.emptyNet) {
                                        obj[key]['home_team']['stats'].goalsInterval[60] += 1
                                    }
                                }
                            }
                            if (away_team_id === item.team.id) {
                                if (item.about.period === 1) {
                                    if (minutes < 10) {
                                        obj[key]['away_team']['stats'].goalsInterval[10] += 1
                                    }
                                    if (minutes >= 10) {
                                        obj[key]['away_team']['stats'].goalsInterval[20] += 1
                                    }
                                }

                                if (item.about.period === 2) {
                                    if (minutes < 10) {
                                        obj[key]['away_team']['stats'].goalsInterval[30] += 1
                                    }
                                    if (minutes >= 10) {
                                        obj[key]['away_team']['stats'].goalsInterval[40] += 1
                                    }
                                }
                                if (item.about.period === 3) {
                                    if (minutes < 10) {
                                        obj[key]['away_team']['stats'].goalsInterval[50] += 1
                                    }
                                    if (minutes >= 10 && minutes < 15) {
                                        obj[key]['away_team']['stats'].goalsInterval[55] += 1
                                    }
                                    if (minutes >= 15 && !item.result.emptyNet) {
                                        obj[key]['away_team']['stats'].goalsInterval[60] += 1
                                    }
                                }
                            }
                        }
                        if (item.result.eventTypeId === CHALLENGE || item.result.eventTypeId === STOP && item.result.description == 'Video Review') {
                            obj[key].video_review = 1;
                        }
                        if (item.about.period === 3 && checkPeriodsTime(item.about.periodTimeRemaining)) {
                            if (item.result.eventTypeId === BLOCKED_SHOT) {
                                if (home_team_id === item.team.id) {
                                    obj[key]['home_team']['stats'].blocked_shots += 1
                                }
                                if (away_team_id === item.team.id) {
                                    obj[key]['away_team']['stats'].blocked_shots += 1
                                }
                            }
                            if (item.result.eventTypeId === SHOT) {
                                if (home_team_id === item.team.id) {
                                    obj[key]['home_team']['stats'].shots += 1
                                    obj[key]['home_team']['stats'].shots_on_goal += 1
                                }
                                if (away_team_id === item.team.id) {
                                    obj[key]['away_team']['stats'].shots += 1
                                    obj[key]['away_team']['stats'].shots_on_goal += 1
                                }
                            }
                            if (item.result.eventTypeId === MISSED_SHOT) {
                                if (home_team_id === item.team.id) {
                                    obj[key]['home_team']['stats'].shots += 1
                                }
                                if (away_team_id === item.team.id) {
                                    obj[key]['away_team']['stats'].shots += 1
                                }
                            }
                            if (item.result.eventTypeId === PERIOD_END) {
                                obj[key]['home_team'].score = item.about.goals.home
                                obj[key]['away_team'].score = item.about.goals.away
                            }
                            if (item.result.eventTypeId === GOAL) {
                                if (home_team_id === item.team.id) {
                                    obj[key]['home_team']['stats'].goals += 1
                                    // obj[key]['home_team']['stats'].goalTime.push(addTwoPeriodTimesToGoal(item.about.periodTime))
                                    if (item.result.emptyNet) {
                                        if (obj[key]['home_team']['stats'].empty_goals === 0) {
                                            obj[key]['home_team']['stats'].empty_goals += 1
                                        }
                                    }
                                }
                                if (away_team_id === item.team.id) {
                                    obj[key]['away_team']['stats'].goals += 1
                                    // obj[key]['away_team']['stats'].goalTime.push(addTwoPeriodTimesToGoal(item.about.periodTime))
                                    if (item.result.emptyNet) {
                                        if (obj[key]['away_team']['stats'].empty_goals === 0) {
                                            obj[key]['away_team']['stats'].empty_goals += 1
                                        }
                                    }
                                }
                            }
                        }
                    })
                }
                //save
                json = JSON.stringify(obj); //convert it back to json
                // fs.writeFile('allgamesNHL.json', json, 'utf8', ()=>{}); // write it back
        await s3.putObject({
            Body: JSON.stringify(json),
            Bucket: "cyclic-fine-tan-snapper-ring-eu-west-1",
            Key: `nhl_games_${currentDate}.json`,
        }).promise()
        return res.status(200).json({
            ...JSON.parse(json)
        })
    }catch (err) {
        return res.status(500).json({
            err: err.toString(),
        });
    }
})
app.get('/get_file_nhl_matches',async (req,res) => {
   try {
       const currentDate = getCurrentDate();
       let nhl_games = await s3.getObject({
           Bucket: "cyclic-fine-tan-snapper-ring-eu-west-1",
           Key: `nhl_games_${currentDate}.json`,
       }).promise()

       let obj = JSON.parse(nhl_games.Body.toString('utf-8'));
       return res.status(200).json({
           ...obj
       })
   }catch (err) {
       return res.status(500).json({
           err: err.toString(),
       });
   }
});
app.listen(process.env.PORT || 3000)