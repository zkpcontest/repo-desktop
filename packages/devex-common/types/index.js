"use strict";
exports.__esModule = true;
exports.EVoterStatus = exports.EContractType = void 0;
var EContractType;
(function (EContractType) {
    EContractType["PollHelper"] = "Helper";
    EContractType["PollMaster"] = "Poll";
})(EContractType = exports.EContractType || (exports.EContractType = {}));
var EVoterStatus;
(function (EVoterStatus) {
    EVoterStatus[EVoterStatus["NotExist"] = 0] = "NotExist";
    EVoterStatus[EVoterStatus["NotVoted"] = 1] = "NotVoted";
    EVoterStatus[EVoterStatus["Voted"] = 2] = "Voted";
})(EVoterStatus = exports.EVoterStatus || (exports.EVoterStatus = {}));
