//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./SchoolMagnet.sol";
import "./DiploMagnet.sol";

contract MagnetAcademy is AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant RECTOR_ROLE = keccak256("RECTOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DIRECTOR_ROLE = keccak256("DIRECTOR_ROLE");

    address private _rector;
    DiploMagnet private _diploMagnet;
    Counters.Counter private _nbSchools;
    // Use Role
    mapping(address => address) private _schoolDirectors; // director to school
    mapping(address => address) private _schools; // school to director

    event AdminAdded(address indexed account);
    event AdminRevoked(address indexed account);
    event SchoolCreated(address indexed schoolAddress, address indexed directorAddress, string name);
    event SchoolDeleted(address indexed schoolAddress, address indexed directorAddress);
    event DirectorSet(address indexed directorAddress, address indexed schoolAddress);

    modifier OnlySchoolDirector(address account) {
        require(_schoolDirectors[account] != address(0), "MagnetAcademy: Not a school director");
        _;
    }

    modifier OnlyNotSchoolDirector(address account) {
        require(_schoolDirectors[account] == address(0), "MagnetAcademy: Already a school director");
        _;
    }

    modifier OnlySchoolAddress(address addr) {
        require(_schools[addr] != address(0), "MagnetAcademy: Only for created schools");
        _;
    }

    constructor(address rector_) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(RECTOR_ROLE, rector_);
        _setupRole(ADMIN_ROLE, rector_);
        _setRoleAdmin(DIRECTOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(ADMIN_ROLE, RECTOR_ROLE);
        _diploMagnet = new DiploMagnet();
        _rector = rector_;
    }

    function addAdmin(address account) public onlyRole(RECTOR_ROLE) {
        grantRole(ADMIN_ROLE, account);
        emit AdminAdded(account);
    }

    function revokeAdmin(address account) public onlyRole(RECTOR_ROLE) {
        revokeRole(ADMIN_ROLE, account);
        emit AdminRevoked(account);
    }

    function changeSchoolDirector(address oldDirector, address newDirector)
        public
        onlyRole(ADMIN_ROLE)
        OnlySchoolDirector(oldDirector)
        OnlyNotSchoolDirector(newDirector)
        returns (bool)
    {
        address schoolAddress = _schoolDirectors[oldDirector];
        _schoolDirectors[oldDirector] = address(0);
        _schoolDirectors[newDirector] = schoolAddress;
        _schools[schoolAddress] = newDirector;
        grantRole(DIRECTOR_ROLE, newDirector);
        revokeRole(DIRECTOR_ROLE, oldDirector);
        emit DirectorSet(newDirector, schoolAddress);
        return true;
    }

    function createSchool(string memory name, address directorAddress)
        public
        onlyRole(ADMIN_ROLE)
        OnlyNotSchoolDirector(directorAddress)
        returns (bool)
    {
        SchoolMagnet school = new SchoolMagnet(name, directorAddress);
        _schoolDirectors[directorAddress] = address(school);
        _schools[address(school)] = directorAddress;
        grantRole(DIRECTOR_ROLE, directorAddress);
        emit DirectorSet(directorAddress, address(school));
        _nbSchools.increment();
        emit SchoolCreated(address(school), directorAddress, name);
        return true;
    }

    function deleteSchool(address schoolAddress)
        public
        onlyRole(ADMIN_ROLE)
        OnlySchoolAddress(schoolAddress)
        returns (bool)
    {
        address directorAddress = _schools[schoolAddress];
        _schools[schoolAddress] = address(0);
        _schoolDirectors[directorAddress] = address(0);
        revokeRole(DIRECTOR_ROLE, directorAddress);
        _nbSchools.decrement();
        emit SchoolDeleted(schoolAddress, directorAddress);
        return true;
    }

    function certify(address student) public onlyRole(DIRECTOR_ROLE) {
        // TODO need more tests: is student registered at school of the director?
        // Need to work more on SchoolMagnet contract for this.
        _diploMagnet.certify(student, _schoolDirectors[msg.sender]);
    }

    //function certify()

    function diploMagnet() public view returns (address) {
        return address(_diploMagnet);
    }

    function nbSchools() public view returns (uint256) {
        return _nbSchools.current();
    }

    function schoolOf(address account) public view returns (address) {
        return _schoolDirectors[account];
    }

    function directorOf(address school) public view returns (address) {
        return _schools[school];
    }

    function rector() public view returns (address) {
        return _rector;
    }

    function isAdmin(address account) public view returns (bool) {
        return hasRole(ADMIN_ROLE, account);
    }

    function isDirector(address account) public view returns (bool) {
        return _schoolDirectors[account] != address(0);
    }

    function isSchool(address addr) public view returns (bool) {
        return _schools[addr] != address(0);
    }
}
