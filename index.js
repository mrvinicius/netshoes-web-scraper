import puppeteer from 'puppeteer'
import fs from 'fs'

(async function () {
  try {
    const browser = await puppeteer.launch({
      userDataDir: './data'
    })
    const page = await browser.newPage()
    const resultList = []
    const pageEndNumber = 49
    let pageNumber = 1
    
    // const allowedRequestTypes = [
    //   'document',
    //   'image',
    //   'imageset',
    //   'font',
    //   'xmlhttprequest',
    //   'stylesheet',
    //   'script',
    //   'object',
    //   'ping',
    //   'speculative',
    //   'web_manifest',
    //   'other',
    //   'beacon',
    //   'main_frame',
    //   'csp_report',
    //   'media',
    //   'object_subrequest',
    //   'sub_frame',
    //   'websocket',
    //   'xbl',
    //   'xml_dtd',
    //   'xslt',
    // ]
    // await page.setRequestInterception(true)
    // page.on('request', (request) => {
    //   if (allowedRequestTypes.includes(request.resourceType())) {
    //     request.continue()
    //   } else {
    //     request.abort()
    //   }
    // })

    await page.setViewport({
      width: 1200,
      height: 800
    })

    while (true) {
      await page.goto(`https://www.netshoes.com.br/refactoring/sapatenis/masculino?mi=hm_ger_mntop_H-CAL-calcados-sapatenis&psn=Menu_Top&tamanho=42&_preco=13000-20000&_preco=8000-13000&nsCat=Artificial&tipo-de-produto=tenis&page=${pageNumber}`)
      await page.waitFor(5000)

      console.log({pageNumber})
      const pageProducts = await scrapeProductsFromPage(page)
      
      if (pageProducts) {
        console.log('inserting...')
        
        resultList.push(...pageProducts.map( prod => ({ pageNumber, ...prod }) ))
        
        pageNumber += 1

        if (pageNumber > pageEndNumber) break
      } else {
        break
      }
    }

    await browser.close()

    fs.writeFile('./json/products.json', JSON.stringify(resultList), err => {
      err ? console.error(err) : console.log('Success!')
    })
  } catch (error) {
    console.error(error)
  }
})()

async function scrapeProductsFromPage(page) {
  await autoScroll(page)

  return page.evaluate(() => {
    const productCardList = document.querySelectorAll('div.wrapper .item-card')
    const data = []

    if (!productCardList.length) return null

    for (const productCard of productCardList) {
      const stars = productCard.querySelector('.item-card__description__stars')

      if (!stars.childElementCount) {
        continue
      }

      const rating = parseFloat(stars.innerText.trim())

      if (rating < 4.5) {
        continue
      }

      try {
        const imageLink = productCard.querySelector('.item-card__images__image-link')
        const title = productCard.querySelector('.item-card__description__product-name').innerText.trim()
        const productUrl = imageLink.href
        const imageUrl = 'https:' + imageLink.querySelector('img').dataset.srcset.split(',')[1].trim()
        const price = productCard.querySelector("[data-price='price']").innerText.trim()
  
        data.push({
          rating,
          title,
          productUrl,
          imageUrl,
          price,
        })
      } catch (_) {}

    }

    return data
  })
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0
      const distance = 100
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight
        window.scrollBy(0, distance)
        totalHeight += distance

        if (totalHeight >= scrollHeight) {
          clearInterval(timer)
          resolve()
        }
      }, 100)
    })
  })
}