import { ethers } from "hardhat";
import { Distributor } from "../typechain";
const { Parser } = require('json2csv');
const sPERC = "0xf64F48A4E27bBC299273532B26c83662ef776b7e";
const sLPPERC = "0xc014286360Ef45aB15A6D3f6Bb1E54a03352aC8f";
const parser = new Parser();
const fs = require('fs').promises;
const fsSync = require("fs");
const whaleThresholdAmount = ethers.utils.parseEther("100000");
const todayInSeconds = new Date().getSeconds();
const oneDay = 86400;

async function main() {
  const contract = await ethers.getContractFactory("Distributor") as unknown as Distributor;
  const sPERCInfo = await getInfo(contract.attach(sPERC));
  const sLPERCInfo = await getInfo(contract.attach(sLPPERC));
  const sPERCFile = parser.parse(sPERCInfo);
  const sLPERCFile = parser.parse(sLPERCInfo);
  await handleFiles(sPERCFile, sLPERCFile);
  return {
    sPERC: sPERCFile,
    sLPERC: sLPERCFile
  };
}

async function handleFiles(sPERCFile: any, sLPERCFile: any) {
  if(!fsSync.existsSync("./sheets")) {
    fsSync.mkdirSync("./sheets");
  }
  await fs.writeFile(`./sheets/sLPERC.csv`, sLPERCFile);
  await fs.writeFile(`./sheets/sPERC.csv`, sPERCFile);
}

async function getInfo(stakingContract: Distributor) {
  const holders = await getHolders(stakingContract);
  return getHolderInfo(holders, stakingContract);
}

async function getHolders(stakingContract: Distributor) {
  const depositFilter = await stakingContract.filters.Deposited();
  const deposits = await stakingContract.queryFilter(depositFilter);
  const receivers = deposits.map((d) => {
    return d.args.receiver;
  });
  return [...new Set(receivers)];
}

async function getHolderInfo(holders: string[], stakingContract: Distributor) {
  const holdersWithTime = [];
  const day = 86400;
  const supply = await stakingContract.totalSupply();
  let totalStaked = 0;
  let allShares = 0;
  let allClaimed = 0;
  let allUnclaimed = 0;
  for(let h of holders) {
    const deposits = await stakingContract.getDepositsOf(h);
    const info = {
      "depositor address": h,
      "total deposited": 0,
      "total shares": 0,
      "total time": 0,
      "average time of deposit": "",
      "portion of the pool": "",
      "number of deposits": deposits.length,
      claimed: 0,
      "total rewards": 0,
      unclaimed: 0
    };
    for(const d of deposits) {
      info["total deposited"] += parseInt(d.amount.toString()) / 1e18;
      info["total shares"] += parseInt(d.shareAmount.toString()) / 1e18;
      // @ts-ignore
      info["total time"] += (d.end - d.start) / day;
      totalStaked += info["total deposited"];
      allShares += info["total shares"];
      // log whales that have their deposits coming up
      if(d.amount.gte(whaleThresholdAmount) && todayInSeconds >= d.end.toNumber() - (oneDay * 14)) {
        console.log("======================\n");
        console.log(`whale ${h} with ${d.amount.toNumber() / 1e18} PERC deposited will have their deposit expire soon at ${new Date(d.end.toNumber()).toDateString()}`);
        console.log("======================\n");
      }
    }
    info["total deposited"] = Number(info["total deposited"].toFixed(2));
    info["total shares"] = Number(info["total shares"].toFixed(2));
    info["average time of deposit"] = (info["total time"] / info["number of deposits"]).toFixed(0) + " days";
    // @ts-ignore
    info["portion of the pool"] = `${(((info["total shares"] * 1e18) / supply) * 100).toFixed(4)}%`;
    // @ts-ignore
    info["total time"] = `${info["total time"].toFixed(0)} days`;
    // @ts-ignore
    info.claimed = parseInt(((await stakingContract.withdrawnRewardsOf(h)).toString() / 1e18).toFixed(2));
    allClaimed += info.claimed;
    // @ts-ignore
    info["total rewards"] = (await stakingContract.cumulativeRewardsOf(h)).toString() / 1e18;
    // @ts-ignore
    info.unclaimed = (await stakingContract.withdrawableRewardsOf(h)).toString() / 1e18;
    allUnclaimed += info.unclaimed;

    holdersWithTime.push(info);
  }

  holdersWithTime.push({
    "depositor address": ""
  });

  holdersWithTime.push({
    "depositor address": "number of holders",
    "total deposited": holdersWithTime.length
  });

  holdersWithTime.push({
    "depositor address": "total staked",
    "total deposited": totalStaked.toFixed(2)
  });

  holdersWithTime.push({
    "depositor address": "all shares held",
    "total deposited": allShares.toFixed(2)
  });

  holdersWithTime.push({
    "depositor address": "total PERC claimed",
    "total deposited": allClaimed
  });

  holdersWithTime.push({
    "depositor address": "total PERC unclaimed",
    "total deposited": allUnclaimed
  });

  return holdersWithTime;
}

main().then((hodlers) => {
  console.log("Sheets updated");
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
