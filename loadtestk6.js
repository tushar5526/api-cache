import http, { get } from 'k6/http';
import { check, sleep } from "k6";
import {
    getCurrentStageIndex,
} from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';


const BASE_URL = 'http://localhost:3000';

export let options = {
    stages: [
        // Ramp-up from 1 to TARGET_VUS virtual users (VUs) in 20s
        { duration: "5s", target: 1000 },

        // Stay at rest on TARGET_VUS VUs for 2m
        { duration: "10s", target: 3500 },

        // Ramp up to TARGET_VUS VUs for 30s (peak load)
        { duration: "10s", target: 3500 },

        // Ramp-down from TARGET_VUS to 0 VUs for 20s
        { duration: "5s", target: 0 }
    ]
};

const songId = [];
const singerEmail = [];

function createSong(title, email) {
    const headers = {
        'Content-Type': 'application/json',
    }
    const body = {
        title: title,
        singerEmail: email
    }
    let res = http.post(BASE_URL + '/song', JSON.stringify(body), { headers: headers })
    res = res.json()
    if (res.success)
        songId.push(res.payload.id)
    return res
}

function createArtist(name, email) {
    const headers = {
        'Content-Type': 'application/json',
    }
    const body = {
        'name': name,
        'email': email
    }
    let res = http.post(BASE_URL + '/artist', JSON.stringify(body), { headers: headers })
    res = res.json()
    if (res.success)
        singerEmail.push(body.email)
    return res
}

function fakeName() {
    return Math.random().toString(36).substring(2, 7) + Date.now();
}
function fakeEmail() {
    return fakeName() + Date.now() + '@gmail.com';
}



export default () => {
    if (getCurrentStageIndex() === 0) {
        for (let i = 0; i < 1000; ++i) {
            createArtist(fakeName(), fakeEmail())
            createSong(fakeName() + fakeName(), singerEmail[randomIntFromInterval(0, singerEmail.length - 1)])
        }
        return
    }

    let res;
    const randomInt = randomIntFromInterval(1, 100);
    if (randomInt <= 90) {
        const getCount = randomIntFromInterval(0, 2)
        if (getCount === 0)
            res = http.get(BASE_URL + '/artists')
        else if (getCount === 1)
            res = http.get(BASE_URL + '/playlist')
        else
            res = http.get(BASE_URL + '/song/' + randomIntFromInterval(1, 1000))
    }
    else {
        const postCount = randomIntFromInterval(0, 2)
        if (postCount === 0)
            res = createArtist(fakeName(), fakeEmail())
        else if (postCount === 1 && singerEmail.length > 0)
            res = createSong(fakeName() + fakeName(), singerEmail[randomIntFromInterval(0, singerEmail.length - 1)])
        else if (postCount === 2 && songId.length > 0)
            res = http.put(BASE_URL + '/song/release/' + songId[randomIntFromInterval(0, songId.length - 1)])
        else return
    }
    check(res, { 'status': res.success })
};

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}