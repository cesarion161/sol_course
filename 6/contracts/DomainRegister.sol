// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./DomainValidation.sol";

/**
 * @title Domain Registration Contract
 * @author Oleksandr Radchenko
 * @dev Stores domain registrations
 */
contract DomainRegister {

    struct Domain {
        string name;
        uint256 registrationTime;
    }

    address payable public owner;
    uint256 public registrationFee = 0.005 ether;
    mapping(address => Domain[]) private controllerDomains;
    Domain[] private allDomains;

    event DomainRegistered(address indexed controller, string domain, uint256 timestamp, uint256 totalRegistered);
    event FeeUpdated(uint256 newFee);

    constructor() {
        owner = payable(msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier paysFee() {
        require(msg.value >= registrationFee, "Insufficient fee");
        _;
    }

    modifier validDomain(string memory _domain) {
        require(DomainValidation.isValidDomain(_domain), "Invalid domain");
        _;
    }

    /**
     * @dev Registers a new domain
     * @param domain The domain name to register
     * Emits a {DomainRegistered} event
     */
    function registerDomain(string memory domain) external payable paysFee validDomain(domain) {
        Domain memory newDomain = Domain(domain, block.timestamp);
        controllerDomains[msg.sender].push(newDomain);
        allDomains.push(newDomain);

        emit DomainRegistered(msg.sender, domain, block.timestamp, allDomains.length);
    }

    /**
     * @dev Retrieves all domains belonging to the caller address
     * @return string[] representing domain names registered by the caller
     */
    function getMyDomains() external view returns (string[] memory) {
        Domain[] memory domains = controllerDomains[msg.sender];
        string[] memory domainNames = new string[](domains.length);

        for (uint i = 0; i < domains.length; i++) {
            domainNames[i] = domains[i].name;
        }

        return domainNames;
    }

    /**
     * @notice Updates the registration fee for domain registration
     * @dev This function can only be called by the contract owner. Emits a `FeeUpdated` event upon success
     * @param newFee The new registration fee in wei
     */
    function updateRegistrationFee(uint256 newFee) external onlyOwner {
        registrationFee = newFee;
        emit FeeUpdated(newFee);
    }

    /**
     * @notice Withdraws all funds collected by the contract to the owner's address
     * @dev This function can only be called by the contract owner
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool sent,) = owner.call{value: balance}("");
        require(sent, "Failed to send fee to the owner");
    }
}
