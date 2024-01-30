"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const he = require("he");
const cheerio_1 = require("cheerio");
const CryptoJS = require("crypto-js");

const host = "http://ww" + "w.90" + "t8.com"
const token_host = "https://a" + "gi" + "t.ai"
const token_txt = 'token_date: 2023-12-20'

let enable_plugin = true;
const plugin_name = "酷狗音乐"

const pageSize = 30;

async function get_plugin_token() {
    let raw_html = (await axios_1.default.get(token_host + "/vale_gtt/MSC_API/raw/branch/master/my_plugins/token")).data
    console.log("raw_html=", raw_html)
    if(token_txt !== raw_html)
    {
        enable_plugin = false;
        console.log("Token无效, 本插件已禁用.")
    }
    else
    {
        enable_plugin = true;
        console.log("Token有效, 已使能本插件.")
    }
}

function formatMusicItem(_) {
    const albumid = _.albumid || _.album?.id;
    const albummid = _.albummid || _.album?.mid;
    const albumname = _.albumname || _.album?.title;
    return {
        id: _.id,           // 音乐在2t58的id
        songmid: undefined, // 音乐在酷我的id
        title: _.title,
        artist: _.artist,
        artwork: undefined,
        album: albumname,
        lrc: _.lyric || undefined,
        albumid: undefined,
        albummid: undefined,
    };
}

async function parse_play_list_html(raw_data, separator) {
    const $ = cheerio_1.load(raw_data);
    const raw_play_list = $("div.main").find("li");
    let song_list_arr = [];
    for(let i=0; i<raw_play_list.length; i++)
    {
        const item=$(raw_play_list[i]).find("a");
        
        let data_id = $(item[0]).attr("href").match(/\/mp3\/(.*?).html/)[1]
        // console.log($(item[0]).text())
        let separated_text = $(item[0]).text().split(separator)
        let data_artist = separated_text[0] // 通过分隔符区分歌手和歌名
        let data_title = separated_text[1]!="" ? separated_text[1]:separated_text[2];
        data_title = data_title.replace('》[MP3_LRC]', '');
        song_list_arr.push({
            id: data_id, 
            title: data_title, 
            artist: data_artist,
        })
    }
    // console.log("song_list_arr:",song_list_arr)
    return(song_list_arr)
}

async function parse_top_list_html(raw_data) {
    const $ = cheerio_1.load(raw_data);
    const raw_play_list = $("div.gt").find("li");
    // const page_data = $("div.pagedata").text();
    let cover_img = "https://agit.ai/vale_gtt/MSC_API/raw/branch/master/my_plugins/logo/kg.jpg"
    let hot_list = [];
    for(let i=1; i<12; i++)
    {
        const item=$(raw_play_list[i]).find("a");
        let data_address = $(item[0]).attr("href")
        let data_title = $(item[0]).text()
        hot_list.push({
            id: data_address, 
            coverImg: cover_img,
            title: data_title, 
            description: "每日同步官方数据。"// + page_data
        })
    }
    let spectial_list = []
    for(let i=13; i<24; i++)
    {
        const item=$(raw_play_list[i]).find("a");
        let data_address = $(item[0]).attr("href")
        let data_title = $(item[0]).text()
        spectial_list.push({
            id: data_address, 
            coverImg: cover_img,
            title: data_title, 
            description: "每日同步官方数据。"// + page_data
        })
    }
    let global_list = []
    for(let i=26; i<36; i++)
    {
        const item=$(raw_play_list[i]).find("a");
        let data_address = $(item[0]).attr("href")
        let data_title = $(item[0]).text()
        global_list.push({
            id: data_address, 
            coverImg: cover_img,
            title: data_title, 
            description: "每日同步官方数据。"// + page_data
        })
    }
    // console.log("song_list_arr:",song_list_arr)
    return {
        hot_list,
        spectial_list,
        global_list
    };
    
}

async function searchMusic(query, page) {
    console.log("searchMusic enable_plugin=", enable_plugin)
    if(!enable_plugin)
    {
        console.log("无效的Token, 本插件已禁用。")
        return;
    }

    let key_word = encodeURIComponent(query)
    let url_serch = host + "/so.php?wd=" + key_word
    // console.log(url_serch)
    let search_res = (await axios_1.default.get(url_serch)).data
    // console.log(search_res)
    let song_list = await parse_play_list_html(search_res, " - ")

    const songs = song_list.map(formatMusicItem);

    return {
        isEnd: true,
        data: songs,
    };
}


async function getLyric(musicItem) {
    // console.log("getLyric:", musicItem)
    let res = (await (0, axios_1.default)({
        method: "get",
        url: host+"/plug/down.php?ac=music&lk=lrc&id=" + musicItem.id,
        timeout: 10000,
    })).data;
    res = res.replace("44h4", '****');  //屏蔽歌词中的网站信息
    res = res.replace("爱听", '****');  
    res = res.replace("2t58", '****'); 
    return {
        rawLrc: res
    };
}


async function getTopLists() {
    if(!enable_plugin)
    {
        console.log("无效的Token, 本插件已禁用。")
        return;
    }
        
    const raw_html = (await axios_1.default.get(host + "/list/top.html")).data
    let toplist = await parse_top_list_html(raw_html)

    return [{
        title: "热门榜单",
        data: (toplist.hot_list).map((_) => {
            return ({
                id: _.id,
                coverImg: _.coverImg,
                title: _.title,
                description: _.description,
            });
        }),
    }, 
    {
        title: "特色音乐",
        data: (toplist.spectial_list).map((_) => {
            return ({
                id: _.id,
                coverImg: _.coverImg,
                title: _.title,
                description: _.description,
            });
        }),
    },
    {
        title: "全球榜单",
        data: (toplist.global_list).map((_) => {
            return ({
                id: _.id,
                coverImg: _.coverImg,
                title: _.title,
                description: _.description,
            });
        }),
    }
];
}

async function getTopListDetail(topListItem) {

    let url_serch = host + topListItem.id
    // console.log(url_serch)
    let search_res = (await axios_1.default.get(url_serch)).data
    let song_list = await parse_play_list_html(search_res, "《")

    let res =  {
        ...topListItem,
        musicList: song_list.map((_) => {
            return {
                id: _.id,
                title: _.title,
                artist: _.artist,
                album: undefined,
                albumId: undefined,
                artistId: undefined,
                formats: undefined,
            };
        }),
    };
    return res;
}

async function getMusicSheetResponseById(id, page, pagesize = 50) {
    return (await axios_1.default.get(`http://nplserver.kuwo.cn/pl.svc`, {
        params: {
            op: "getlistinfo",
            pid: id,
            pn: page - 1,
            rn: pagesize,
            encode: "utf8",
            keyset: "pl2012",
            vipver: "MUSIC_9.1.1.2_BCS2",
            newver: 1,
        },
    })).data;
}

async function getRecommendSheetTags() {
    const res = (await axios_1.default.get(`http://wapi.kuwo.cn/api/pc/classify/playlist/getTagList?cmd=rcm_keyword_playlist&user=0&prod=kwplayer_pc_9.0.5.0&vipver=9.0.5.0&source=kwplayer_pc_9.0.5.0&loginUid=0&loginSid=0&appUid=76039576`)).data.data;
    // console.log(res)
    const data = res
        .map((group) => ({
        title: group.name,
        data: group.data.map((_) => ({
            id: _.id,
            digest: _.digest,
            title: _.name,
        })),
    }))
        // .filter((item) => item.data.length)
        ;
    const pinned = [
        {
            id: "1848",
            title: "翻唱",
            digest: "10000",
        },
        {
            id: "621",
            title: "网络",
            digest: "10000",
        },
        {
            title: "伤感",
            digest: "10000",
            id: "146",
        },
        {
            title: "欧美",
            digest: "10000",
            id: "35",
        },
    ];
    return {
        data,
        pinned,
    };
}

async function getRecommendSheetsByTag(tag, page) {
    const pageSize = 20;
    let res;
    if (tag.id) {
        if (tag.digest === "10000") {
            res = (await axios_1.default.get(`http://wapi.kuwo.cn/api/pc/classify/playlist/getTagPlayList?loginUid=0&loginSid=0&appUid=76039576&pn=${page - 1}&id=${tag.id}&rn=${pageSize}`)).data.data;
        }
        else {
            let digest43Result = (await axios_1.default.get(`http://mobileinterfaces.kuwo.cn/er.s?type=get_pc_qz_data&f=web&id=${tag.id}&prod=pc`)).data;
            res = {
                total: 0,
                data: digest43Result.reduce((prev, curr) => [...prev, ...curr.list]),
            };
        }
    }
    else {
        res = (await axios_1.default.get(`https://wapi.kuwo.cn/api/pc/classify/playlist/getRcmPlayList?loginUid=0&loginSid=0&appUid=76039576&&pn=${page - 1}&rn=${pageSize}&order=hot`)).data.data;
    }
    const isEnd = page * pageSize >= res.total;
    return {
        isEnd,
        data: res.data.map((_) => ({
            title: _.name,
            artist: _.uname,
            id: _.id,
            artwork: _.img,
            playCount: _.listencnt,
            createUserId: _.uid,
        })),
    };
}

async function getMediaDownloadUrl(musicItem, quality){
    let _header = {
        'Referer': host + `/mp3/${musicItem.id}.html`,
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/113.0.0.0",
        // 'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        // 'Accept-Encoding':'gzip, deflate',
        // 'Accept-Language':'zh-CN,zh;q=0.9',
        'Cookie':'Hm_lvt_a33f51a72fc140eb7044c0d7a431d116=1704434875,1704624111,1704684835,1705882727; mode=1; songIndex=0; down_mima=ok; coin_screen=1536*864; Hm_lpvt_a33f51a72fc140eb7044c0d7a431d116=1705913024',
        // 'Connection':'keep-alive',
    }


    let _url = host + '/plug/down.php'
    let _params = {
        'ac': 'music',
        'id': musicItem.id,
        // 'lk':'320',
    }
    console.log('________url',_url)
    console.log('________header',_header)
    console.log('________params',_params);

    axios_1.defaults.withCredentials = true
    
    let mp3_Result = (await axios_1({
        method: "GET",
        url: _url,
        headers: _header,
        params: _params,
        responseType:'stream',
    })).data;

    console.log(mp3_Result.responseUrl)
    return mp3_Result.responseUrl
}





async function getMediaSource(musicItem, quality) {
    // 90t8.com获取音源
    let req_url = host + `/mp3/${musicItem.id}.html`
    let mp3_Result = (await (0, axios_1.default)({
        url: req_url,
        method: 'get',
        timeout: 3000,
    })).data;
    // console.log("search from third: ", mp3_Result)
    if(mp3_Result)
    {
        const $ = cheerio_1.load(mp3_Result);
        let raw_lrc = $("div.gc").text();
        let raw_url_html = $("div.container").find("script").text().match(/url:"(.*?).mp3"/)
        let raw_artwork = $("div.playhimg").find("img").attr("src");
        let raw_url = ''
        
        if(raw_url_html === null)
        {
            raw_url = await getMediaDownloadUrl(musicItem, quality)
        }
        else
        {
            raw_url = raw_url_html[1] + ".mp3"
        }

        if(raw_url !== null)
        {
            raw_lrc = raw_lrc.replace("90T8", '****');  //屏蔽歌词中的网站信息
            raw_lrc = raw_lrc.replace("44h4", '****'); 
            raw_lrc = raw_lrc.replace("90听音乐网", '');  //屏蔽歌词中的网站信息
        
            return {
                url: raw_url,
                rawLrc: raw_lrc,
                artwork: raw_artwork,
            };
        }
    }
    return {
        url: ""
    };
}

async function getMusicSheetInfo(sheet, page) {
    const res = await getMusicSheetResponseById(sheet.id, page, pageSize);
    return {
        isEnd: page * pageSize >= res.total,
        musicList: res.musiclist
            // .filter(musicListFilter)
            .map((_) => ({
            id: _.id,
            title: he.decode(_.name || ""),
            artist: he.decode(_.artist || ""),
            album: he.decode(_.album || ""),
            albumId: _.albumid,
            artistId: _.artistid,
            formats: _.formats,
        })),
    };
}

// 获取token，并根据token的有效性，开启或关闭本插件
get_plugin_token()
module.exports = {
    platform: plugin_name,
    version: "0.1.15",
    appVersion: ">0.1.0-alpha.0",
    order: 19,
    srcUrl: "https://agit.ai/vale_gtt/MSC_API/raw/branch/master/my_plugins/third_party/my_90t8.js",
    cacheControl: "no-cache",
    hints: {
        importMusicSheet: [],
    },

    async search(query, page, type) {
        console.log("search(query, page, type): ", query, page, type)
        if (type === "music") {
            return await searchMusic(query, page);
        }
    },

    getMediaSource,
    getLyric: getMediaSource,
    getTopLists,
    getTopListDetail,
    // getRecommendSheetTags,
    // getRecommendSheetsByTag,
    // getMusicSheetInfo,
    getMusicInfo: getMediaSource
};

// searchMusic("圣诞星").then(console.log)
// getLyric()
// getTopLists().then(console.log)
// getRecommendSheetTags()

// let music_item_1 = {
//       id: '5fa340b158c2e385e64338177384cfd7',
//       songmid: undefined,
//       title: '圣诞星 (feat. 杨瑞代)',
//       artist: '周杰伦',
//       artwork: undefined,
//       album: undefined,
//       lrc: undefined,
//       albumid: undefined,
//       albummid: undefined
//     }
// let music_item_2 = {
//       id: '10986b847f4ddb6f42041b426f7756eb',
//       songmid: undefined,
//       title: '圣诞星 (改编版)',
//       artist: '大力滴滴滴',
//       artwork: undefined,
//       album: undefined,
//       lrc: undefined,
//       albumid: undefined,
//       albummid: undefined
//     }
// getMediaSource(music_item_1).then(console.log)
// getMediaDownloadUrl(music_item_2)
// let top_item={
//     id: "/list/kugou.html",
//     coverImg: undefined,
//     title: "酷狗飙升榜",
//     description: "每日同步官方数据。",
// }

// getTopListDetail(top_item).then(console.log)
// getRecommendSheetTags()