const https = require('https')
const fs = require('fs')
const path = require('path')

const searchContent = '送别'
const reptileFileName = path.resolve(__dirname, 'E-book.search.json')
let result = null
let uid = 0

try {
    result = JSON.parse(fs.readFileSync(reptileFileName, {encoding: 'utf-8'}))
} catch (e) {
    result = [
        {
            index: uid,
            title: '',
            url: 'https://www.newbixia.com/book/158/a158358/165219.html'
        }
    ]
}
const last = result[result.length - 1]
uid = last.index
const url = new URL(last.nextUrl)
console.log('从这里开始：', last)
function search(url) {
    const now = Date.now()
    https.get(url, (res) => {
        const {statusCode} = res;
        const contentType = res.headers['content-type'];

        let error;
        // 任何 2xx 状态码都表示成功响应，但这里只检查 200。
        if (statusCode !== 200) {
            error = new Error('Request Failed.\n' +
                `Status Code: ${statusCode}`);
        } else if (!/^application\/json/.test(contentType)) {
            error = new Error('Invalid content-type.\n' +
                `Expected application/json but received ${contentType}`);
        }
        res.setEncoding('utf8');
        let html = '';
        res.on('data', (chunk) => {
            html += chunk.toString();
        });
        res.on('end', () => {
            const title = html.match(/(?<=<title>)([^<]+)(?!<\/title>)/)
            uid++
            if (title) {
                console.log(uid, Date.now() - now + 'ms', title[0], url.href)
            }
            const index = html.indexOf(searchContent)
            const regExp = new RegExp('<.*href="([^"]*)".*>(?=下一章)')
            const $s = html.match(regExp)
            if (!$s || !$s[1]) {
                console.log('遍历结束')
                return
            }
            if (index > -1) {
                console.log('找到了：', html.slice(index, index + 10))
                const temp = {
                    index: uid,
                    title,
                    url: url.href
                }
                url.pathname = $s[1]
                temp.nextUrl = url.href
                temp.music = html.slice(index, index + 10)
                writeReptile(temp)
            } else {
                const temp = {
                    index: uid,
                    title,
                    url: url.href
                }
                url.pathname = $s[1]
                temp.nextUrl = url.href
                writeReptile(temp)
                search(url)

            }
        });

        res.on('error', () => {
            setTimeout(() => {
                search(url)
            }, 1000)
        })
    }).on('error', (e) => {
        setTimeout(() => {
            search(url)
        }, 1000)
    });
}

search(url)

function writeReptile(obj) {
    result.push(obj)
    fs.writeFileSync(reptileFileName, JSON.stringify(result, null, 4), {encoding: 'utf-8'})
}
