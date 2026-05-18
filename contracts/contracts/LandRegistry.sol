// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LandRegistry
 * @dev Blockchain-based land registry for India - Bhumi
 */
contract LandRegistry {
    enum PropertyStatus {
        Pending,
        Verified,
        Disputed,
        Transferred
    }

    struct OwnershipRecord {
        string ownerAadhaar;
        uint256 timestamp;
        string actionType;
    }

    struct Property {
        string propertyId;
        string ownerAadhaar;
        string location;
        uint256 area;
        string ipfsHash;
        PropertyStatus status;
        bool exists;
        uint256 registeredAt;
    }

    address public admin;
    mapping(address => bool) public governmentOfficials;
    mapping(string => Property) private properties;
    mapping(string => OwnershipRecord[]) private ownershipHistory;
    mapping(string => bool) private propertyIdExists;

    event PropertyRegistered(
        string indexed propertyId,
        string ownerAadhaar,
        string location,
        uint256 area,
        string ipfsHash,
        uint256 timestamp
    );

    event PropertyVerified(
        string indexed propertyId,
        address indexed verifiedBy,
        uint256 timestamp
    );

    event OwnershipTransferred(
        string indexed propertyId,
        string previousOwner,
        string newOwner,
        uint256 timestamp
    );

    event PropertyDisputed(
        string indexed propertyId,
        string reason,
        uint256 timestamp
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyGovernmentOfficial() {
        require(governmentOfficials[msg.sender], "Only government officials");
        _;
    }

    modifier propertyExists(string memory propertyId) {
        require(properties[propertyId].exists, "Property not found");
        _;
    }

    constructor() {
        admin = msg.sender;
        governmentOfficials[msg.sender] = true;
    }

    function addGovernmentOfficial(address official) external onlyAdmin {
        governmentOfficials[official] = true;
    }

    function removeGovernmentOfficial(address official) external onlyAdmin {
        governmentOfficials[official] = false;
    }

    function registerProperty(
        string memory propertyId,
        string memory ownerAadhaar,
        string memory location,
        uint256 area,
        string memory ipfsHash
    ) external {
        require(!propertyIdExists[propertyId], "Property ID already exists");
        require(bytes(propertyId).length > 0, "Invalid property ID");
        require(bytes(ownerAadhaar).length > 0, "Invalid owner Aadhaar");
        require(area > 0, "Area must be greater than zero");

        properties[propertyId] = Property({
            propertyId: propertyId,
            ownerAadhaar: ownerAadhaar,
            location: location,
            area: area,
            ipfsHash: ipfsHash,
            status: PropertyStatus.Pending,
            exists: true,
            registeredAt: block.timestamp
        });

        propertyIdExists[propertyId] = true;

        ownershipHistory[propertyId].push(
            OwnershipRecord({
                ownerAadhaar: ownerAadhaar,
                timestamp: block.timestamp,
                actionType: "REGISTERED"
            })
        );

        emit PropertyRegistered(
            propertyId,
            ownerAadhaar,
            location,
            area,
            ipfsHash,
            block.timestamp
        );
    }

    function verifyProperty(string memory propertyId)
        external
        onlyGovernmentOfficial
        propertyExists(propertyId)
    {
        Property storage prop = properties[propertyId];
        require(
            prop.status == PropertyStatus.Pending,
            "Property not pending verification"
        );

        prop.status = PropertyStatus.Verified;

        ownershipHistory[propertyId].push(
            OwnershipRecord({
                ownerAadhaar: prop.ownerAadhaar,
                timestamp: block.timestamp,
                actionType: "VERIFIED"
            })
        );

        emit PropertyVerified(propertyId, msg.sender, block.timestamp);
    }

    function transferOwnership(
        string memory propertyId,
        string memory newOwnerAadhaar
    ) external propertyExists(propertyId) {
        Property storage prop = properties[propertyId];
        require(
            prop.status == PropertyStatus.Verified,
            "Property must be verified before transfer"
        );
        require(
            bytes(newOwnerAadhaar).length > 0,
            "Invalid new owner Aadhaar"
        );
        require(
            keccak256(bytes(prop.ownerAadhaar)) !=
                keccak256(bytes(newOwnerAadhaar)),
            "New owner must be different"
        );

        string memory previousOwner = prop.ownerAadhaar;
        prop.ownerAadhaar = newOwnerAadhaar;
        prop.status = PropertyStatus.Transferred;

        ownershipHistory[propertyId].push(
            OwnershipRecord({
                ownerAadhaar: newOwnerAadhaar,
                timestamp: block.timestamp,
                actionType: "TRANSFERRED"
            })
        );

        emit OwnershipTransferred(
            propertyId,
            previousOwner,
            newOwnerAadhaar,
            block.timestamp
        );
    }

    function raiseDispute(string memory propertyId, string memory reason)
        external
        propertyExists(propertyId)
    {
        properties[propertyId].status = PropertyStatus.Disputed;
        emit PropertyDisputed(propertyId, reason, block.timestamp);
    }

    function getProperty(string memory propertyId)
        external
        view
        propertyExists(propertyId)
        returns (
            string memory,
            string memory,
            string memory,
            uint256,
            string memory,
            PropertyStatus,
            uint256
        )
    {
        Property memory prop = properties[propertyId];
        return (
            prop.propertyId,
            prop.ownerAadhaar,
            prop.location,
            prop.area,
            prop.ipfsHash,
            prop.status,
            prop.registeredAt
        );
    }

    function getOwnershipHistory(string memory propertyId)
        external
        view
        propertyExists(propertyId)
        returns (OwnershipRecord[] memory)
    {
        return ownershipHistory[propertyId];
    }

    function getOwnershipHistoryLength(string memory propertyId)
        external
        view
        returns (uint256)
    {
        return ownershipHistory[propertyId].length;
    }

    function isGovernmentOfficial(address account) external view returns (bool) {
        return governmentOfficials[account];
    }
}
