import "@nomicfoundation/hardhat-toolbox";
import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {expect} from "chai";
import hre, {ethers} from "hardhat";
import {DomainRegister} from "../typechain-types";

const SUFFICIENT_FEE = ethers.parseEther("0.005");
const INSUFFICIENT_FEE = ethers.parseEther("0.001");
const NEW_FEE = ethers.parseEther("0.01");

async function deploy() {
    const [owner, nonOwner1, nonOwner2] = await ethers.getSigners();
    const domainRegister = await hre.ethers.deployContract("DomainRegister");
    return {domainRegister, owner, nonOwner1, nonOwner2};
}

describe("Domain registration", function () {

    describe("Valid domains", function () {

        it("Should allow registration of a valid domain", async function () {
            const {domainRegister, owner} = await loadFixture(deploy);
            const tx = await domainRegister.registerDomain("example.com", {value: SUFFICIENT_FEE});
            const receipt = await tx.wait();
            const timestamp = (await ethers.provider.getBlock(receipt!.blockNumber))!.timestamp;
            await expect(tx)
                .to.emit(domainRegister, "DomainRegistered")
                .withArgs(owner.getAddress(), "example.com", timestamp, 1);
        });

        it("Should emit DomainRegistered events with correct metrics", async function () {
            const {domainRegister, owner} = await loadFixture(deploy);
            const registrationFee = {value: SUFFICIENT_FEE};
            const tx1 = await domainRegister.connect(owner)
                .registerDomain("example.com", registrationFee);
            await tx1.wait();
            const tx2 = await domainRegister.connect(owner)
                .registerDomain("example.org", registrationFee);
            const receipt2 = await tx2.wait();

            const domainRegisterInterface = new ethers.Interface([
                "event DomainRegistered(address indexed controller, string domain, uint256 timestamp, uint256 totalRegistered)"
            ]);

            const events1 = receipt2!.logs
                .map(log => domainRegisterInterface.parseLog(log))
                .filter(parsedLog => parsedLog!.name === "DomainRegistered");
            const events2 = receipt2!.logs
                .map(log => domainRegisterInterface.parseLog(log))
                .filter(parsedLog => parsedLog!.name === "DomainRegistered");

            expect(events1.length).to.be.equal(1);
            expect(events2.length).to.be.equal(1);
        });

        it("Should reject domain registration with insufficient fee", async function () {
            const {domainRegister} = await loadFixture(deploy);
            await expect(domainRegister.registerDomain("example.com", {value: INSUFFICIENT_FEE}))
                .to.be.revertedWith("Insufficient fee");
        });
    });

    describe("Invalid domains", function () {

        let domainRegister: DomainRegister;

        beforeEach(async function () {
            ({domainRegister} = await loadFixture(deploy));
        });

        async function testInvalidDomainRegistration(domain: string) {
            await expect(domainRegister.registerDomain(domain, {value: SUFFICIENT_FEE}))
                .to.be.revertedWith("Invalid domain");
        }

        it("Should reject domain that is too long", async function () {
            // Assuming the maximum length is 253 characters for a full domain name
            const longDomain = "a".repeat(254) + ".com";
            await testInvalidDomainRegistration(longDomain);
        });

        it("Should reject domain starting with a dot", async function () {
            await testInvalidDomainRegistration(".example.com");
        });

        it("Should reject domain ending with a dot", async function () {
            await testInvalidDomainRegistration("example.com.");
        });

        it("Should reject domain with consecutive dots", async function () {
            await testInvalidDomainRegistration("example..com");
        });

        it("Should reject domains with invalid characters", async function () {
            await testInvalidDomainRegistration("example-com");
            await testInvalidDomainRegistration("example*com");
            await testInvalidDomainRegistration("example?com");
            await testInvalidDomainRegistration("example]com");
            await testInvalidDomainRegistration("exampleЪcom");
            await testInvalidDomainRegistration("example com");
        });

        it("Should reject empty domain string", async function () {
            await testInvalidDomainRegistration("");
        });
    });
});

describe("Domain retrieval", function () {

    it("Should correctly retrieve multiple domains registered by the caller", async function () {
        const {domainRegister, owner} = await loadFixture(deploy);
        await domainRegister.registerDomain("example.com", {value: SUFFICIENT_FEE});
        await domainRegister.registerDomain("example.org", {value: SUFFICIENT_FEE});
        const domains = await domainRegister.connect(owner).getMyDomains();
        expect(domains).to.deep.equal(["example.com", "example.org"]);
    });

    it("Should ensure users can only retrieve their own domains", async function () {
        const {domainRegister, nonOwner1, nonOwner2} = await loadFixture(deploy);
        await domainRegister.connect(nonOwner1).registerDomain("user1domain.com", {value: SUFFICIENT_FEE});
        await domainRegister.connect(nonOwner2).registerDomain("user2domain.com", {value: SUFFICIENT_FEE});

        const user1Domains = await domainRegister.connect(nonOwner1).getMyDomains();
        const user2Domains = await domainRegister.connect(nonOwner2).getMyDomains();

        expect(user1Domains).to.deep.equal(["user1domain.com"]);
        expect(user2Domains).to.deep.equal(["user2domain.com"]);
    });

    it("Should retrieve domains sorted by registration time", async function () {
        const {domainRegister, owner} = await loadFixture(deploy);

        await domainRegister.connect(owner).registerDomain("first.com", {value: SUFFICIENT_FEE});
        await domainRegister.connect(owner).registerDomain("second.com", {value: SUFFICIENT_FEE});
        await domainRegister.connect(owner).registerDomain("third.com", {value: SUFFICIENT_FEE});
        await domainRegister.connect(owner).registerDomain("fourth.com", {value: SUFFICIENT_FEE});

        const domains = await domainRegister.connect(owner).getMyDomains();

        expect(domains[0]).to.equal("first.com");
        expect(domains[1]).to.equal("second.com");
        expect(domains[2]).to.equal("third.com");
        expect(domains[3]).to.equal("fourth.com");
    });
});

describe("Updating fees", function () {

    it("Should allow the owner to update the registration fee", async function () {
        const {domainRegister, owner} = await loadFixture(deploy);
        await expect(domainRegister.connect(owner).updateRegistrationFee(NEW_FEE))
            .to.emit(domainRegister, "FeeUpdated")
            .withArgs(NEW_FEE);
    });

    it("Should prevent non-owners from updating the registration fee", async function () {
        const {domainRegister, nonOwner1} = await loadFixture(deploy);
        await expect(domainRegister.connect(nonOwner1).updateRegistrationFee(NEW_FEE))
            .to.be.revertedWith("Only the owner can call this function");
    });
});

describe("Withdrawing", function () {

    it("Should allow the owner to withdraw the balance", async function () {
        const {domainRegister, owner, nonOwner1} = await loadFixture(deploy);
        const registrationFee = {value: SUFFICIENT_FEE};
        await domainRegister.connect(nonOwner1).registerDomain("example.com", registrationFee);

        const initialOwnerBalance = await ethers.provider.getBalance(owner.getAddress());
        const contractBalance = await ethers.provider.getBalance(domainRegister.getAddress());

        const tx = await domainRegister.withdraw();
        const receipt = await tx.wait();
        const transactionCost = receipt!.gasUsed * receipt!.gasPrice;

        expect(await ethers.provider.getBalance(domainRegister.getAddress()))
            .to.equal(0);
        expect(await ethers.provider.getBalance(owner.getAddress()))
            .to.equal(initialOwnerBalance + contractBalance - transactionCost);
    });

    it("Should not allow non-owner to withdraw the balance", async function () {
        const {domainRegister, nonOwner1} = await loadFixture(deploy);
        await expect(domainRegister.connect(nonOwner1).withdraw())
            .to.be.revertedWith("Only the owner can call this function");
    });
});



