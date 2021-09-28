const puppeteer = require('puppeteer-extra');
// stealth plugin
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const args = {
  departureAirport: 'OSL',
  arrivalAirport: 'FCO',
};

const url = `https://www.norwegian.com/api/fare-calendar/calendar?adultCount=1&destinationAirportCode=${args.arrivalAirport}&originAirportCode=${args.departureAirport}&outboundDate=2021-11-01&tripType=1&currencyCode=EUR&languageCode=en-GB&pageId=258774&eventType=user`;

///////
puppeteer.launch({ headless: true }).then(async (browser) => {
  console.log('Running scraper..');
  const page = await browser.newPage();

  await page.goto(url);
  await page.waitForTimeout(5000);

  let allDepartFlights = [];
  let priceAndDate = [];
  let dayObj = [];

  // gets the dates and prices
  for (let i = 3; i < 33; i++) {
    try {
      // date selector
      date = await page.$eval(
        `#folder${i} > div.opened > div:nth-child(1) > span:nth-child(2)`,
        (el) =>
          el.textContent
            .trim()
            .replaceAll(':', '')
            .replaceAll('T', '')
            .substring(0, 10)
      );
      // price selector
      price = await page.$eval(
        `#folder${i} > div.opened > div:nth-child(2) > span:nth-child(2)`,
        (el) => el.textContent
      );

      // gets the day from date
      singleDate = await date.substr(-2);

      dayObj.push({
        day: singleDate,
      });

      priceAndDate.push({
        departFlight: {
          flight_date: date,
          price: price,
        },
      });
    } catch (err) {
      console.log(err.message);
    }
  }

  // goes to page and scrapes data
  for (let i = 0; i < priceAndDate.length; i++) {
    const dataUrl = `https://www.norwegian.com/en/ipc/availability/avaday?D_City=OSL&A_City=FCO&TripType=1&D_Day=${dayObj[i].day}&D_Month=202111&D_SelectedDay=${dayObj[i].day}&R_Day=${dayObj[i].day}&R_Month=202111&R_SelectedDay=${dayObj[i].day}&dFlight=DY1872OSLFCO&dCabinFareType=1&IncludeTransit=false&AgreementCodeFK=-1&CurrencyCode=EUR&ShowNoFlights=True&rnd=58814&processid=94015`;

    await page.goto(dataUrl);

    const selector =
      '#avaday-outbound-result > div > div > div.bodybox > div > table > tbody';

    departureAirport = await page.$eval(
      `${selector} > tr.oddrow.rowinfo2 > td.depdest > div`,
      (el) => el.textContent
    );
    departureTime = await page.$eval(
      `${selector} > tr.oddrow.rowinfo1 > td.depdest > div`,
      (el) => el.textContent
    );

    arrivalAirport = await page.$eval(
      `${selector} > tr.oddrow.rowinfo2 > td.arrdest > div`,
      (el) => el.textContent
    );

    arrivalTime = await page.$eval(
      `${selector} > tr.oddrow.rowinfo1 > td.arrdest > div `,
      (el) => el.textContent
    );
    duration = await page.$eval(
      `${selector} > tr.oddrow.rowinfo2 > td.duration > div `,
      (el) => el.textContent.slice(10)
    );

    taxes = await page.$eval(
      '#ctl00_MainContent_ipcAvaDay_upnlResSelection > div:nth-child(1) > div > table > tbody > tr:nth-child(19) > td.rightcell.emphasize',
      (el) => el.textContent
    );
    allDepartFlights.push({
      flight: {
        date: priceAndDate[i].departFlight.flight_date,
        dep_airport_short: args.departureAirport,
        dep_airport: departureAirport,
        departure_time: departureTime,
        arr_airport_short: args.arrivalAirport,
        arrival_airport: arrivalAirport,
        arrival_time: arrivalTime,
        duration,
        price: `€${priceAndDate[i].departFlight.price}`,
        taxes,
      },
    });
  }

  await console.log(allDepartFlights);
  await browser.close();
  console.log('script end');
});
