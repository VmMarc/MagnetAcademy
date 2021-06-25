// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract DiploMagnet is ERC721, AccessControl {
    using Counters for Counters.Counter;

    struct Diploma {
        address student;
        address school;
    }

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    Counters.Counter private _diplomaId;

    mapping(uint256 => Diploma) private _diplomas;

    constructor() ERC721("DiploMagnet", "DM") {
        // msg.sender should the MagnetAcademy contract
        _setupRole(MINTER_ROLE, msg.sender);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // mint function
    function certify(address student, address schoolAddress) public onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = _diplomaId.current();
        _mint(student, tokenId);
        _diplomaId.increment();
        _diplomas[tokenId] = Diploma(student, schoolAddress);
        return tokenId;
    }
}
