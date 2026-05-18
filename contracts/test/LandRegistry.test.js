const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LandRegistry", function () {
  let landRegistry;
  let admin;
  let official;
  let user;

  const propertyId = "PROP-001";
  const ownerAadhaar = "123456789012";
  const location = "Bhubaneswar, Odisha";
  const area = 1200;
  const ipfsHash = "QmTestHash123";

  beforeEach(async function () {
    [admin, official, user] = await ethers.getSigners();
    const LandRegistry = await ethers.getContractFactory("LandRegistry");
    landRegistry = await LandRegistry.deploy();
    await landRegistry.waitForDeployment();
    await landRegistry.addGovernmentOfficial(official.address);
  });

  describe("Property Registration", function () {
    it("Should register a new property", async function () {
      await expect(
        landRegistry.registerProperty(
          propertyId,
          ownerAadhaar,
          location,
          area,
          ipfsHash
        )
      ).to.emit(landRegistry, "PropertyRegistered");

      const prop = await landRegistry.getProperty(propertyId);
      expect(prop[0]).to.equal(propertyId);
      expect(prop[1]).to.equal(ownerAadhaar);
    });

    it("Should reject duplicate property ID", async function () {
      await landRegistry.registerProperty(
        propertyId,
        ownerAadhaar,
        location,
        area,
        ipfsHash
      );

      await expect(
        landRegistry.registerProperty(
          propertyId,
          ownerAadhaar,
          location,
          area,
          ipfsHash
        )
      ).to.be.revertedWith("Property ID already exists");
    });
  });

  describe("Property Verification", function () {
    beforeEach(async function () {
      await landRegistry.registerProperty(
        propertyId,
        ownerAadhaar,
        location,
        area,
        ipfsHash
      );
    });

    it("Should allow government official to verify", async function () {
      await expect(
        landRegistry.connect(official).verifyProperty(propertyId)
      ).to.emit(landRegistry, "PropertyVerified");
    });

    it("Should reject non-official verification", async function () {
      await expect(
        landRegistry.connect(user).verifyProperty(propertyId)
      ).to.be.revertedWith("Only government officials");
    });
  });

  describe("Ownership Transfer", function () {
    const newOwner = "987654321098";

    beforeEach(async function () {
      await landRegistry.registerProperty(
        propertyId,
        ownerAadhaar,
        location,
        area,
        ipfsHash
      );
      await landRegistry.connect(official).verifyProperty(propertyId);
    });

    it("Should transfer ownership", async function () {
      await expect(
        landRegistry.transferOwnership(propertyId, newOwner)
      ).to.emit(landRegistry, "OwnershipTransferred");

      const prop = await landRegistry.getProperty(propertyId);
      expect(prop[1]).to.equal(newOwner);
    });
  });
});
