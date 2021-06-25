/* eslint-disable comma-dangle */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-unused-vars */
/* eslint-disable quotes */
/* eslint-disable no-undef */

const { expect } = require('chai');

describe('MagnetAcademy', function () {
  let deployer,
    rector,
    director1,
    director2,
    director3,
    academyAdmin1,
    academyAdmin2,
    student1,
    student2,
    lambdaUser,
    lambdaAddress,
    MagnetAcademy,
    magnetAcademy;
  const school1Name = 'School1';
  const school2Name = 'School2';
  const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;
  const RECTOR_ROLE = ethers.utils.id('RECTOR_ROLE');
  const ADMIN_ROLE = ethers.utils.id('ADMIN_ROLE');
  beforeEach(async function () {
    [
      deployer,
      rector,
      academyAdmin1,
      academyAdmin2,
      student1,
      student2,
      lambdaUser,
      lambdaAddress,
      director1,
      director2,
      director3,
    ] = await ethers.getSigners();
    MagnetAcademy = await ethers.getContractFactory('MagnetAcademy');
    magnetAcademy = await MagnetAcademy.connect(deployer).deploy(rector.address);
    await magnetAcademy.deployed();
  });

  describe('MagnetAcademy deployment', function () {
    it('Should have a rector', async function () {
      expect(await magnetAcademy.rector()).to.equal(rector.address);
    });
    it('Should have rector as administrator', async function () {
      expect(await magnetAcademy.isAdmin(rector.address)).to.be.true;
    });
    it('Should have 0 school created in the academy at deployment', async function () {
      expect(await magnetAcademy.nbSchools()).to.equal(0);
    });
    it('Should have a DiploMagnet address', async function () {
      expect(await magnetAcademy.diploMagnet()).to.not.equal(ethers.constants.AddressZero);
    });
    it('Deployer should have DEFAULT_ADMIN_ROLE', async function () {
      expect(await magnetAcademy.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
    });
    it('Rector should have RECTOR_ROLE', async function () {
      expect(await magnetAcademy.hasRole(RECTOR_ROLE, rector.address)).to.be.true;
    });
    it('Rector should have ADMIN_ROLE', async function () {
      expect(await magnetAcademy.hasRole(ADMIN_ROLE, rector.address)).to.be.true;
    });
  });

  describe('Administrators system management', function () {
    beforeEach(async function () {
      // academyAdmin1 is an admin for our tests
      await magnetAcademy.connect(rector).addAdmin(academyAdmin1.address);
    });

    it('A rector should be able to nominate an admin', async function () {
      await magnetAcademy.connect(rector).addAdmin(academyAdmin2.address);
      expect(await magnetAcademy.isAdmin(academyAdmin2.address)).to.be.true;
    });
    it('Should emit AdminAdded event when admin is added', async function () {
      await expect(magnetAcademy.connect(rector).addAdmin(academyAdmin2.address))
        .to.emit(magnetAcademy, 'AdminAdded')
        .withArgs(academyAdmin2.address);
    });
    it('Only rector can add a a new admin', async function () {
      // add a new admin
      await magnetAcademy.connect(rector).addAdmin(academyAdmin1.address);
      // a lambda user can not add a new admin
      await expect(
        magnetAcademy.connect(lambdaUser).addAdmin(academyAdmin2.address),
        'a lambda user can not add a new admin'
      ).to.be.reverted;
      // an admin can not add a new admin
      await expect(
        magnetAcademy.connect(academyAdmin1).addAdmin(academyAdmin2.address),
        'an admin can not add a new admin'
      ).to.be.reverted;
    });
    it('A rector should be able to revoke an admin', async function () {
      expect(await magnetAcademy.isAdmin(academyAdmin1.address), 'academyAdmin1 should be an admin').to.be.true;
      await magnetAcademy.connect(rector).revokeAdmin(academyAdmin1.address);
      expect(await magnetAcademy.isAdmin(academyAdmin1.address)).to.be.false;
    });
    it('Should emit AdminRevoked event when admin is revoked', async function () {
      expect(await magnetAcademy.isAdmin(academyAdmin1.address), 'academyAdmin1 should be an admin').to.be.true;
      await expect(magnetAcademy.connect(rector).revokeAdmin(academyAdmin1.address))
        .to.emit(magnetAcademy, 'AdminRevoked')
        .withArgs(academyAdmin1.address);
    });
    it('Only rector can revoke an admin', async function () {
      // add a new admin
      await magnetAcademy.connect(rector).addAdmin(academyAdmin2.address);
      // a lambda user can not revoke an admin
      await expect(
        magnetAcademy.connect(lambdaUser).revokeAdmin(academyAdmin2.address),
        'a lambda user can not revoke an admin'
      ).to.be.reverted;
      // an admin can not revoke an admin
      await expect(
        magnetAcademy.connect(academyAdmin1).revokeAdmin(academyAdmin2.address),
        'an admin can not revoke an admin'
      ).to.be.reverted;
    });
  });

  describe('School creation', function () {
    let school1Address, tx;
    beforeEach(async function () {
      // compute school1Address before deployment
      school1Address = ethers.utils.getContractAddress({
        from: magnetAcademy.address,
        nonce: await ethers.provider.getTransactionCount(magnetAcademy.address),
      });
      // Set academyAdmin1 as an admin of the academy
      await magnetAcademy.connect(rector).addAdmin(academyAdmin1.address);
      // Deploy School1
      tx = await magnetAcademy.connect(academyAdmin1).createSchool(school1Name, director1.address);
    });
    it('Admin should be able to create a school', async function () {
      expect(await magnetAcademy.isSchool(school1Address)).to.be.true;
    });
    it('Should set a director at school creation', async function () {
      expect(await magnetAcademy.isDirector(director1.address)).to.be.true;
    });
    it('Should map a director to the new created school', async function () {
      expect(await magnetAcademy.directorOf(school1Address)).to.equal(director1.address);
    });
    it('Should map a school new created school to a director', async function () {
      expect(await magnetAcademy.schoolOf(director1.address)).to.equal(school1Address);
    });
    it('Should increment nb schools', async function () {
      const oldNbSchool = await magnetAcademy.nbSchools();
      await magnetAcademy.connect(academyAdmin1).createSchool(school2Name, director2.address);
      const newNbSchool = await magnetAcademy.nbSchools();
      expect(newNbSchool).to.equal(oldNbSchool.add(1));
    });
    it('Should emit a DirectorSet event at deployment', async function () {
      await expect(tx).to.emit(magnetAcademy, 'DirectorSet').withArgs(director1.address, school1Address);
    });
    it('Should emit a SchoolCreated event at deployment', async function () {
      await expect(tx).to.emit(magnetAcademy, 'SchoolCreated').withArgs(school1Address, director1.address, school1Name);
    });
    it('Should revert if not created by admin', async function () {
      await expect(magnetAcademy.connect(lambdaUser).createSchool(school2Name, director2.address)).to.be.reverted;
    });
    it('Should revert if director of new school is already mapped to a school', async function () {
      await expect(
        magnetAcademy.connect(academyAdmin1).createSchool(school2Name, director1.address)
      ).to.be.revertedWith('MagnetAcademy: Already a school director');
    });
  });
  describe('School destruction', function () {
    let school1Address;
    beforeEach(async function () {
      // compute school1Address before deployment
      school1Address = ethers.utils.getContractAddress({
        from: magnetAcademy.address,
        nonce: await ethers.provider.getTransactionCount(magnetAcademy.address),
      });
      // Set academyAdmin1 as an admin of the academy
      await magnetAcademy.connect(rector).addAdmin(academyAdmin1.address);
      // Deploy School1
      await magnetAcademy.connect(academyAdmin1).createSchool(school1Name, director1.address);
    });
    it('Admin should be able to delete a school', async function () {
      await magnetAcademy.connect(academyAdmin1).deleteSchool(school1Address);
      expect(await magnetAcademy.isSchool(school1Address)).to.be.false;
    });
    it('School deletion unmap director from school', async function () {
      await magnetAcademy.connect(academyAdmin1).deleteSchool(school1Address);
      expect(await magnetAcademy.directorOf(school1Address)).to.equal(ethers.constants.AddressZero);
    });
    it('School deletion unmap school from director', async function () {
      await magnetAcademy.connect(academyAdmin1).deleteSchool(school1Address);
      expect(await magnetAcademy.schoolOf(director1.address)).to.equal(ethers.constants.AddressZero);
    });
    it('Should decrement nb schools at deletion', async function () {
      const oldNbSchool = await magnetAcademy.nbSchools();
      await magnetAcademy.connect(academyAdmin1).deleteSchool(school1Address);
      const newNbSchool = await magnetAcademy.nbSchools();
      expect(newNbSchool).to.equal(oldNbSchool.sub(1));
    });
    it('Should emit SchoolDeleted event at deletion', async function () {
      await expect(magnetAcademy.connect(academyAdmin1).deleteSchool(school1Address))
        .to.emit(magnetAcademy, 'SchoolDeleted')
        .withArgs(school1Address, director1.address);
    });
    it('Should revert if not deleted by an admin', async function () {
      await expect(magnetAcademy.connect(lambdaUser).deleteSchool(school1Address)).to.be.reverted;
    });
    it('Should revert if school does not exist', async function () {
      await expect(magnetAcademy.connect(academyAdmin1).deleteSchool(lambdaAddress.address)).to.be.revertedWith(
        'MagnetAcademy: Only for created schools'
      );
    });
  });
  describe('School Directors changes', function () {
    let school1Address, tx;
    beforeEach(async function () {
      // compute school1Address before deployment
      school1Address = ethers.utils.getContractAddress({
        from: magnetAcademy.address,
        nonce: await ethers.provider.getTransactionCount(magnetAcademy.address),
      });
      // Set academyAdmin1 as an admin of the academy
      await magnetAcademy.connect(rector).addAdmin(academyAdmin1.address);
      // Deploy School1
      tx = await magnetAcademy.connect(academyAdmin1).createSchool(school1Name, director1.address);
    });
    it('Admin can change school directors', async function () {
      expect(await magnetAcademy.isDirector(director1.address), 'director1 should be a director').to.be.true;
      expect(await magnetAcademy.isDirector(director2.address), 'director2 should not be a director').to.be.false;
      await magnetAcademy.connect(academyAdmin1).changeSchoolDirector(director1.address, director2.address);
      expect(await magnetAcademy.isDirector(director1.address), 'director1 should not be a director').to.be.false;
      expect(await magnetAcademy.isDirector(director2.address), 'director2 should be a director').to.be.true;
    });
    it('Should unmap old director to school', async function () {
      await magnetAcademy.connect(academyAdmin1).changeSchoolDirector(director1.address, director2.address);
      expect(await magnetAcademy.schoolOf(director1.address)).to.equal(ethers.constants.AddressZero);
    });
    it('Should map new director to school', async function () {
      await magnetAcademy.connect(academyAdmin1).changeSchoolDirector(director1.address, director2.address);
      expect(
        await magnetAcademy.directorOf(school1Address),
        'school1 address should be mapped to director2 address'
      ).to.equal(director2.address);
      expect(
        await magnetAcademy.schoolOf(director2.address),
        'director2 address should be mapped to school1 address'
      ).to.equal(school1Address);
    });
    it('Should emit DirectorSet when directors change', async function () {
      await expect(magnetAcademy.connect(academyAdmin1).changeSchoolDirector(director1.address, director2.address))
        .to.emit(magnetAcademy, 'DirectorSet')
        .withArgs(director2.address, school1Address);
    });
    it('Should revert if directors are not changed by admin', async function () {
      await expect(magnetAcademy.connect(lambdaUser).changeSchoolDirector(director1.address, director2.address)).to.be
        .reverted;
    });
    it('Should revert if old director is not mapped to a school', async function () {
      await expect(
        magnetAcademy.connect(academyAdmin1).changeSchoolDirector(director2.address, director3.address)
      ).to.be.revertedWith('MagnetAcademy: Not a school director');
    });
    it('Should revert if new director is mapped to a school', async function () {
      await magnetAcademy.connect(academyAdmin1).createSchool(school2Name, director2.address);
      await expect(
        magnetAcademy.connect(academyAdmin1).changeSchoolDirector(director1.address, director2.address)
      ).to.be.revertedWith('MagnetAcademy: Already a school director');
    });
  });
  describe('Certification', function () {
    let DiploMagnet, diploMagnet;
    beforeEach(async function () {
      diploMagnetAddress = await magnetAcademy.diploMagnet();
      DiploMagnet = await ethers.getContractFactory('DiploMagnet');
      diploMagnet = await DiploMagnet.attach(diploMagnetAddress);
      await magnetAcademy.connect(rector).addAdmin(academyAdmin1.address);
      await magnetAcademy.connect(academyAdmin1).createSchool(school1Name, director1.address);
    });
    it('Director can certify student', async function () {
      expect(await diploMagnet.balanceOf(student1.address)).to.equal(0);
      await magnetAcademy.connect(director1).certify(student1.address);
      expect(await diploMagnet.balanceOf(student1.address)).to.equal(1);
    });
    it('Should revert if not a director of a school tried to certify', async function () {
      await expect(magnetAcademy.connect(rector).certify(student1.address), 'A rector can not certify a student').to.be
        .reverted;
      await expect(magnetAcademy.connect(academyAdmin1).certify(student1.address), 'An admin can not certify a student')
        .to.be.reverted;
      await expect(
        magnetAcademy.connect(lambdaAddress).certify(student1.address),
        'A lambda user can not certify a student'
      ).to.be.reverted;
    });
  });
});
