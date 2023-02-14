import { ethers } from "hardhat";
import { Distributor } from "../typechain";
const sPERC = "0xf64F48A4E27bBC299273532B26c83662ef776b7e";
const sLPPERC = "0xc014286360Ef45aB15A6D3f6Bb1E54a03352aC8f";

async function main() {
  const contract = await ethers.getContractFactory("Distributor") as Distributor;
  const sPERCInfo = await getInfo(contract.attach(sPERC));
  const sLPERCInfo = await getInfo(contract.attach(sLPPERC));

  return {
    sPERC: sPERCInfo,
    sPERCStakerCount: sPERCInfo.length,
    SLPERC: sLPERCInfo,
    sLPERCStakerCount: sLPERCInfo.length,
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
      averageTimeOfDeposit: "",
      portionOfPool: "",
      numberOfDeposits: deposits.length,
      claimed: 0,
      totalRewards: 0,
      unclaimed: 0
    };
    for(const d of deposits) {
      info.totalDeposited += parseInt(d.amount) / 1e18;
      info.totalShares += parseInt(d.shareAmount) / 1e18;
      info.totalTime += (d.end - d.start) / day;
    }
    info.averageTimeOfDeposit = info.totalTime / info.numberOfDeposits + " days";
    info.portionOfPool = `${(((info.totalShares * 1e18) / supply) * 100).toFixed(3)}%`;
    info.totalTime = `${info.totalTime} days`;
    info.claimed = (await stakingContract.withdrawnRewardsOf(h)).toString() / 1e18;
    info.totalRewards = (await stakingContract.cumulativeRewardsOf(h).toString() / 1e18);
    info.unclaimed = (await stakingContract.withdrawableRewardsOf(h)).toString() / 1e18;

    holdersWithTime.push({
      holder: h,
      info: JSON.stringify(info),
    });
  }

  return holdersWithTime;
}

main().then((hodlers) => {
  console.log(hodlers);
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
