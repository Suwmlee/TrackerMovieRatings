// ==UserScript==
// @name         TrackerMovieRatings
// @namespace    https://www.suwmlee.com/
// @version      0.2.1
// @description  Show Douban ratings on BHD
// @description: zh-CN 在tracker站点显示豆瓣评分
// @author       Suwmlee
// @match        *://beyond-hd.me/torrents/*
// @match        *://beyond-hd.me/library/title/*
// @grant        GM.xmlHttpRequest
// @connect      api.douban.com
// @connect      movie.douban.com
// @connect      p.media-imdb.com
// @connect      www.omdbapi.com
// ==/UserScript==

'use strict';

function getURL_GM(url) {
    return new Promise(resolve => GM.xmlHttpRequest({
        method: 'GET',
        url: url,
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                resolve(response.responseText);
            } else {
                console.error(`Error getting ${url}:`, response.status, response.statusText, response.responseText);
                resolve();
            }
        },
        onerror: function (response) {
            console.error(`Error during GM.xmlHttpRequest to ${url}:`, response.statusText);
            resolve();
        }
    }));
}

async function getJSON_GM(url) {
    const data = await getURL_GM(url);
    if (data) {
        return JSON.parse(data);
    }
}

async function getJSONP_GM(url) {
    const data = await getURL_GM(url);
    if (data) {
        const end = data.lastIndexOf(')');
        const [, json] = data.substring(0, end).split('(', 2);
        return JSON.parse(json);
    }
}

async function getJSON(url) {
    try {
        const response = await fetch(url);
        if (response.status >= 200 && response.status < 400)
            return await response.json();
        console.error(`Error fetching ${url}:`, response.status, response.statusText, await response.text());
    }
    catch (e) {
        console.error(`Error fetching ${url}:`, e);
    }
}

async function getDoubanInfo(id) {
    // // TODO: Remove this API completely if it doesn't come back.
    // const data = await getJSON_GM(`https://api.douban.com/v2/movie/imdb/${id}?apikey=0df993c66c0c636e29ecbb5344252a4a`);
    // if (data) {
    //     if (isEmpty(data.alt))
    //         return;
    //     const url = data.alt.replace('/movie/', '/subject/') + '/';
    //     return { url, rating: data.rating };
    // }
    // // Fallback to search.
    const search = await getJSON_GM(`https://movie.douban.com/j/subject_suggest?q=${id}`);
    if (search && search.length > 0 && search[0].id) {
        const abstract = await getJSON_GM(`https://movie.douban.com/j/subject_abstract?subject_id=${search[0].id}`);
        const average = abstract && abstract.subject && abstract.subject.rate ? abstract.subject.rate : '?';
        return {
            url: `https://movie.douban.com/subject/${search[0].id}/`,
            rating: { numRaters: '', max: 10, average },
            title: search[0].title,
        };
    }
}

function isEmpty(s) {
    return !s || s === 'N/A';
}

function insertDoubanRatingDiv(parent, title, rating, link, num_raters, histogram) {
    let star = (5 * Math.round(rating)).toString();
    if (star.length == 1)
        star = '0' + star;
    if (typeof rating === 'number')
        rating = rating.toFixed(1);
    let histogram_html = '';
    if (histogram) {
        histogram_html += '<div class="ratings-on-weight">';
        const max = Object.values(histogram).reduce((r, n) => Math.max(r, n), 0);
        for (let i = 10; i > 0; i--) {
            const percent = histogram[i] * 100 / num_raters;
            histogram_html += `<div class="item">
                <span class="stars${i} starstop" style="width:18px;text-align:center">${i}</span>
                <div class="power" style="width:${64 / max * histogram[i]}px"></div>
                <span class="rating_per">${percent.toFixed(1)}%</span>
                <br>
            </div>`;
        }
        histogram_html += '</div>';
    }
    parent.insertAdjacentHTML('beforeend',
        `<div class="rating_logo">${title}</div>
        <div class="rating_self clearfix">
            <strong class="ll rating_num">${rating}</strong>
            <div class="rating_right">
                <div class="ll bigstar${star}"></div>
                <div style="clear: both" class="rating_sum"><a href=${link} target=_blank>${num_raters.toString().replace(/,/g, '')}人评价</a></div>
            </div>
        </div>` + histogram_html);
}

function insertDoubanInfo(name, value) {
    const info = document.querySelector('#info');
    if (info) {
        if (info.lastElementChild.nodeName != 'BR')
            info.insertAdjacentHTML('beforeend', '<br>');
        info.insertAdjacentHTML('beforeend', `<span class="pl">${name}:</span> ${value}<br>`);
    }
}

function insertBHDDoubanRating(parent, url, rating){
    parent.insertAdjacentHTML('beforeend', 
    `<span class="badge-meta2" title="豆瓣评分">
        <a href="${url}" target="_blank">
            <span style="color:green">
                <i class="fal fa-star"></i>
            </span>
        ${rating}</a>
    </span>`);

    const detail = $("a[title='IMDB']")[0].parentElement;
    detail.insertAdjacentHTML('afterend',
    `<span class="badge-meta2"><a href="${url}" title="豆瓣" target="_blank">
        <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="11px" height="11px" viewBox="0 0 11 11" enable-background="new 0 0 11 11" xml:space="preserve"> 
            <image id="image0" width="11" height="11" x="0" y="0" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAMAAACecocUAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAA2FBMVEUWgSUAdQ4AdA0AdQ0NfR1sr3aZyKCWx50KexlUn110r3tyrnlWn14LehoAdhAegiuGuYuRwJaOvpOOv5OGuowhgiwCdhEAdg8wjT3j7+WgyqRdo2Fgpmadx5/i7+QHdRR3sn8efyojgi9zsHvf7eIJdRUpiTbS5dWz1biv0rRipmnw9/FPmlgngzPu9e9cpWYMdRcHehcdhCtLnVbY6dp1r3wthTZInVQihC4VeR8oizaq0LDR5dTY6dvV59jO49Gr0LApizYhhjAwjz07lUg6lUc6lUj///+7fLO6AAAAAWJLR0RHYL3JewAAAAd0SU1FB+UEDxExDPWxFNkAAAB/SURBVAjXFcbZAoFAAAXQWyqEKEtDTMJUyF7WCm3//0nMeTqAINY4UQAkWalziiyh0VRbnNruQOv2dKNv6IPhCCYZT6ypNaPE/p/OnYWzXBEG0/Wov/ap5zJo9mYb7IL9gR1xOl/C6BqFt/sDz1ecpO80iT9fZHlRVkVVFnn2A2t6DyUkoLRcAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIxLTA0LTE1VDE3OjQ5OjEyKzAwOjAw+Ka3VAAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMS0wNC0xNVQxNzo0OToxMiswMDowMIn7D+gAAAAASUVORK5CYII="></image>
        </svg>豆瓣
    </a></span>`
    )

}

function replaceBHDDoubanName(name){
    console.log(name)
    const bhdtitle = $("h1[class='movie-heading']")[0];
    bhdtitle.children[0].text = name
}

async function replaceBHDDoubanIntro(url){
    const data = await getURL_GM(url);
    if (data) {
        let description = Array.from($('#link-report>[property="v:summary"],#link-report>span.all.hidden', data)[0].childNodes)
        .filter(e => e.nodeType === 3)
        .map(e => e.textContent.trim())
        .join('\n');
        let fix = description.replace(/^|\n/g, '<br>\n　　') + '\n\n'
        if(fix.indexOf("<br>") == 0)
            fix = fix.substring(4);
        let intro = document.querySelector('#torrentBigBookmarkExtension')
        intro.childNodes[0].nodeValue = ''
        intro.insertAdjacentHTML('afterbegin', fix);
    }
}

(async () => {
    let host = location.hostname;
    if (host === 'beyond-hd.me') {
        console.log('Start BHD MovieInfo')
        const imdbSpan = $("span[title='IMDb Rating']");
        if (!imdbSpan) {
            return;
        }
        const imdbLink = imdbSpan[0].children[0].href
        if (!imdbLink) {
            return;
        }
        const id = imdbLink.match(/tt\d+/);
        if (!id)
            return;
        const data = await getDoubanInfo(id);
        if (!data)
            return;
        console.log('GetDoubanInfo')
        insertBHDDoubanRating(imdbSpan[0].parentElement, data.url, data.rating.average)
        replaceBHDDoubanName(data.title)
        replaceBHDDoubanIntro(data.url)
    }
})();