// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

/**
 * @title Domain validation utility library
 * @author Oleksandr Radchenko
 */
library DomainValidation {

    uint8 public constant MAX_LENGTH = 253;

    /**
     * @dev Validates the domain
     * Requirements:
     * - The domain must not be empty and must not exceed 253 characters.
     * - The domain must contain exactly one dot ('.') that is not at the start or end of the domain.
     * - The domain must not contain dots next to each other.
     * - The characters before and after the dot must be alphanumeric or hyphens.
     * - Hyphens ('-') cannot be at the start or end of each part of the domain.
     * @param domain The domain name to validate.
     * @return isValid True if the domain name is valid according to the rules, false otherwise.
     */
    function isValidDomain(string memory domain) internal pure returns (bool isValid) {
        bytes memory domBytes = bytes(domain);
        if (domBytes.length == 0 || domBytes.length > MAX_LENGTH) {
            return false;
        }

        bool dotOccurred = false;
        for (uint256 i = 0; i < domBytes.length; i++) {
            bytes1 char = domBytes[i];

            if (i == 0
                || (i == domBytes.length - 1)
                || (i > 0 && domBytes[i - 1] == '.')
                || (i < domBytes.length - 1 && domBytes[i + 1] == '.')) {
                if (char == '-' || char == '.') {
                    return false;
                }
            }

            if (char == '.') {
                if (dotOccurred) {
                    return false;
                }
                dotOccurred = true;
                continue;
            }

            if (!(char >= '0' && char <= '9')
            && !(char >= 'a' && char <= 'z')
            && !(char >= 'A' && char <= 'Z')
            && char != '-') {
                return false;
            }
        }

        return dotOccurred;
    }
}
