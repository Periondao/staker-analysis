import { ethers } from "hardhat";
import { Distributor } from "../typechain";
const PERC = process.env.PERC as string;
const sPERC = process.env.SPERC as string;
const sLPPERC = process.env.SLPPERC as string;

async function main() {
  const contract = await ethers.getContractFactory("Distributor") as Distributor;
  const sPERCInfo = await getInfo(contract.attach(sPERC));
  const sLPERCInfo = await getInfo(contract.attach(sLPPERC));

  return {
    sPERC: sPERCInfo,
    SLPERC: sLPERCInfo
  };
}

async function getInfo(stakingContract) {
  const holders = await getHolders(stakingContract);
  return getTimePreferences(holders, stakingContract);
}

async function getHolders(stakingContract) {
  const depositFilter = await stakingContract.filters.Deposited();
  const deposits = await stakingContract.queryFilter(depositFilter);
  const receivers = deposits.map((d) => {
    return d.args.receiver;
  });
  return [...new Set(receivers)];
}

async function getTimePreferences(holders, stakingContract) {
  // TODO refactor conversions
  const holdersWithTime = [];
  const day = 86400;
  const supply = await stakingContract.totalSupply();
  for(let h of holders) {
    const deposits = await stakingContract.getDepositsOf(h);
    const info = {
      totalDeposited: 0,
      totalShares: 0,
      totalTime: "0",
      averageTimeOfDeposit: "0",
      portionOfPool: "0%",
      numberOfDeposits: deposits.length
    };
    for(let d of deposits) {
      info.totalDeposited += parseInt(d.amount) / 1e18;
      info.totalShares += parseInt(d.shareAmount) / 1e18;
      info.totalTime += Math.floor((parseInt(d.end) - parseInt(d.start)) / day);
    }
    info.totalTime = `${info.totalTime} days`;
    info.averageTimeOfDeposit = `${Math.floor((parseInt(info.totalTime) / parseInt(info.numberOfDeposits)) / day)} days`;
    info.portionOfPool = `${(parseInt(String(info.totalDeposited)) / parseInt(supply)) * 100}%`;

    holdersWithTime.push({
      holder: h,
      info: info,
      deposits: deposits
    })
  }

  return holdersWithTime;
}

main().then((hodlers) => {
  console.log(hodlers);
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
