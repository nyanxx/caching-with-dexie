import Dexie from "dexie";
import type { TickerObj } from "./assets/fakeSource";

type CacheData = {
  name: string
  data: TickerObj
  timestamp: number
}

// Init Deixe
// Creating a new Dexie instance. "CacheDatabase" will be the name of database.  
const db: Dexie = new Dexie("CacheDatabase");
// Defining schema for version 1 (Dexie uses versioning to manage schema upgrade over time)
db.version(1)
  .stores({ items: "name" }); // Creating store (equivalent to tables in other DB) with store name = "items" and it's primary key will be "name"  

const tickerObj = await get("GOOG");
const tickerObjMany = await getMany(["IBM", "GOOG", "FAIL", "TSLA"]);
console.log(tickerObj);
console.log(tickerObjMany);

/** Get single item */
async function get(name: string): Promise<TickerObj | undefined> {
  try {
    const response = await getFromCache(name);
    // console.log(Object.prototype.toLocaleString.call(response))
    if (response) {
      if (!isExpired(response.timestamp)) {
        console.log(`Serving "${name}" from CACHE`);
        return response.data;
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
async function getMany(names: string[]): Promise<TickerObj[]> {
  const arrayOfPromises: Promise<TickerObj | undefined>[] = names.map((tick: string): Promise<TickerObj | undefined> => get(tick));
  const result: (TickerObj | undefined)[] = await Promise.all(arrayOfPromises);
  // Remove undefined entries from result array
  // const filteredResult: TickerObj[] = result.filter(Boolean);
  return result.filter((tickerObj: TickerObj | undefined): tickerObj is TickerObj => tickerObj !== undefined)
}

/** Check cache */
async function getFromCache(name: string): Promise<Dexie.Promise<CacheData>> {
  // ✨ Getting Data
  return db.table("items").get(name);
}

/** Expiry check */
function isExpired(timestamp: number): boolean {
  // The item is expired if the current time "Date.now()" is greater than the expiration time "ttl".
  const ttl: number = 24 * 60 * 60 * 1000;
  return Date.now() - timestamp > ttl;
}

/**
 * Fetch from source JSON file
 * Example usage: console.log(await fetchTickerDataFromSource("IBM"));
 **/
async function fetchTickerDataFromSource(name: string): Promise<TickerObj | undefined> {
  try {
    console.log(`Trying to fetch "${name}" from source...`);
    const response: Response = await fetch("/fakeSource.json");
    let tickerArr: TickerObj[] = await response.json();

    tickerArr = tickerArr.filter((tickerObject: TickerObj): boolean => (tickerObject.ticker === name));

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
    return undefined;
  }
}

/** Add to cache  */
async function addInCache(name: string, dataObject: TickerObj) {
  try {
    if (dataObject) {
      const cacheData: CacheData = {
        name: name,
        data: dataObject,
        timestamp: Date.now()
      }
      /** 
      * ✨ Inserting Data
      * .add : Inserts a new record
      * .put : Inserts or updates a record
      */
      await db.table("items").put(cacheData);
      console.log(`"${name}" cached successfully!`);
    }
  } catch (error) {
    console.error("Error:-", error);
  }
}

/** Get ticker data from fakeSource.js */
// import { tickerData } from "./assets/fakeSource";
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
