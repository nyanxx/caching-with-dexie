import Dexie from "dexie";

// Init Deixe
const db = new Dexie("CacheDatabase");
db.version(1).stores({ items: "name" });

const tickerObj = await get("GOOG");
const tickerObjMany = await getMany(["IBM", "GOOG", "FAIL", "TSLA"]);
console.log(tickerObj);
console.log(tickerObjMany);

/** Get single item */
async function get(name) {
  try {
    const response = await getFromCache(name);
    if (response) {
      if (!isExpired(response.timestamp)) {
        console.log(`Serving "${name}" from CACHE`);
        return response;
      }
    } else {
      console.log(`"${name}" is not in CACHE or is expired!`);
      // Fetch new data and add in cache database
      const fetchedData = await fetchTickerDataFromSource(name);
      if (fetchedData) {
        addInCache(name, fetchedData);
        console.log(`Serving "${name}" from SOURCE`);
        return fetchedData;
      }
    }
  } catch (error) {
    console.error("Error in get()", error);
  }
}

/** Get multiple items  */
async function getMany(names) {
  const arrayOfPromises = names.map((tick) => get(tick));
  const result = await Promise.all(arrayOfPromises);
  // Remove undefined entries from result array
  return result.filter(Boolean);
}

/** Check cache */
async function getFromCache(name) {
  return db.items.get(name);
}

/** Expiry check */
function isExpired(timestamp) {
  // The item is expired if the current time "Date.now()" is greater than the expiration time "ttl".
  const ttl = 24 * 60 * 60 * 1000;
  return Date.now() - timestamp > ttl;
}

/**
 * Fetch from source JSON file
 * Example usage: console.log(await fetchTickerDataFromSource("IBM"));
 **/
async function fetchTickerDataFromSource(name) {
  try {
    console.log(`Trying to fetch "${name}" from source...`);
    const resopnse = await fetch("../fakeSource.JSON");
    const jsonArr = await resopnse.json();
    const tickerArr = jsonArr.filter((tickerObject) => {
      if (tickerObject.ticker === name) {
        return tickerObject;
      }
    });
    if (tickerArr[0]) {
      // Returning the object within the array
      return tickerArr[0];
    } else {
      console.error(
        `Failed to fetch "${name}" from SOURCE or data not available!`
      );
    }
  } catch (err) {
    console.log("Error:- Fetching from source failed!", err);
    return null;
  }
}

/** Add to cache  */
async function addInCache(name, dataObject) {
  try {
    if (dataObject) {
      // [?] Should i be using .put or .add
      await db.items.put({
        name: name,
        data: dataObject,
        timestamp: Date.now(),
      });
      console.log(`"${name}" cached successfully!`);
    }
  } catch (error) {
    console.error("Error:-", error);
  }
}

/** Get ticker data from fakeSource.js */
// import { tickerData } from "../fakeSource";
// function getTickerDataFromJS(name) {
//   const data = tickerData.filter((tickerName) => {
//     if (tickerName.ticker == name) {
//       return tickerName;
//     }
//   });
//   if (data[0]) {
//     return data[0];
//   } else {
//     console.error("problem getting ticker data");
//     return;
//   }
// }
