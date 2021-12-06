export enum EContractType {
    PollHelper = 'Helper',
    PollMaster = 'Poll'
}

export enum EVoterStatus {
    NotExist,
    NotVoted,
    Voted
}

export interface IPoll {
    address: string;
    created: number;
    verifyingKey?: string;
    proofKey?: string;
    privateKey?: {
        hash: string;
        hex?: string;
    };
    status?: boolean;
    ending?: number;
    voters?: {
        total: number;
        voted: number;
        detailed: {
            [number: string]: EVoterStatus
        }
    };
    answers?: {
        hex: string;
        utf8: string;
    }[];
    votes?: {
        encrypted: string;
        decrypted: string;
    }[];
}
