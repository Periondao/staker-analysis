import { ethers } from "hardhat";
import { Distributor } from "../typechain";
const { Parser } = require('json2csv');
const sPERC = "0xf64F48A4E27bBC299273532B26c83662ef776b7e";
const sLPPERC = "0xc014286360Ef45aB15A6D3f6Bb1E54a03352aC8f";
const parser = new Parser();
const fs = require('fs').promises;
const fsSync = require("fs");

async function main() {
  const contract = await ethers.getContractFactory("Distributor") as Distributor;
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

async function handleFiles(sPERCFile, sLPERCFile) {
  if(!fsSync.existsSync("./sheets")) {
    fsSync.mkdirSync("./sheets");
  }
  await fs.writeFile(`./sheets/sLPERC.csv`, sLPERCFile);
  await fs.writeFile(`./sheets/sPERC.csv`, sPERCFile);
}

async function getInfo(stakingContract) {
  const holders = await getHolders(stakingContract);
  return getHolderInfo(holders, stakingContract);
}

async function getHolders(stakingContract) {
  const depositFilter = await stakingContract.filters.Deposited();
  const deposits = await stakingContract.queryFilter(depositFilter);
  const receivers = deposits.map((d) => {
    return d.args.receiver;
  });
  return [...new Set(receivers)];
}

async function getHolderInfo(holders, stakingContract) {
  const holdersWithTime = [];
  const day = 86400;
  const supply = await stakingContract.totalSupply();
  let totalStaked = 0;
  let allShares = 0;
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
      info["total deposited"] += parseInt(d.amount) / 1e18;
      info["total deposited"] += parseInt(d.shareAmount) / 1e18;
      info["total time"] += (d.end - d.start) / day;
      totalStaked += info["total deposited"];
      allShares += info["total deposited"];
    }
    info["average time of deposit"] = info["total time"] / info["number of deposits"] + " days";
    info["portion of the pool"] = `${(((info["total shares"] * 1e18) / supply) * 100).toFixed(3)}%`;
    // @ts-ignore
    info["total time"] = `${info["total time"]} days`;
    info.claimed = (await stakingContract.withdrawnRewardsOf(h)).toString() / 1e18;
    info["total rewards"] = (await stakingContract.cumulativeRewardsOf(h).toString() / 1e18);
    info.unclaimed = (await stakingContract.withdrawableRewardsOf(h)).toString() / 1e18;

    holdersWithTime.push(info);
  }

  holdersWithTime.push({ "number of holders": holdersWithTime.length, "total staked": totalStaked, "all shares held": allShares });

  return holdersWithTime;
}

main().then((hodlers) => {
  console.log(hodlers);
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
