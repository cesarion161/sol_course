# Domain register

A simple domain register solidity contract with tests.

```shell
npm run compile
npm run test
npm run node
npm run deploy
```

If you are running an issue with deployment with error '- Artifact bytecodes have been changed',
try this:

```shell
rm -rf ignition/deployments
npx hardhat clean
```