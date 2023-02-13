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
  for(let h of holders) {
    const deposits = await stakingContract.getDepositsOf(h);
    const info = {
      totalDeposited: 0,
      totalShares: 0,
      totalTime: 0,
      averageTimeOfDeposit: 0,
      portionOfPool: 0,
      numberOfDeposits: deposits.length
    };
    for(const d of deposits) {
      info.totalDeposited += parseInt(d.amount) / 1e18;
      info.totalShares += parseInt(d.shareAmount) / 1e18;
      info.totalTime += Math.floor((d.end - d.start) / day);
    }
    info.averageTimeOfDeposit = Math.floor(info.totalTime / info.numberOfDeposits);
    info.portionOfPool = ((info.totalShares * 1e18) / supply) * 100;

    holdersWithTime.push({
      holder: h,
      info: JSON.stringify(info),
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
