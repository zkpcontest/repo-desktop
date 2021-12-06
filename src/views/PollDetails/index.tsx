import React, {useEffect, useState} from "react";
import {Button, Form, InputGroup} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSearch, faSpinner} from "@fortawesome/free-solid-svg-icons";
import PollDetails from "./Details";
import PollVote from "./Vote";
import PollFinish from "./Finish";
import {IPoll} from "devex-common/types";


interface IPollDetailsViewProps {
    address?: string;
    created?: number;
}

const PollDetailsView = (props: IPollDetailsViewProps) => {
    const {everscale} = (window as any).electron;
    const [address, setAddress] = useState<string>('');
    const [created, setCreated] = useState<string>();
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const [poll, setPoll] = useState<IPoll>();

    /**
     * Get poll details
     */
    const getPoll = React.useCallback(async () => {
        if (!address) return;
        try {
            setPoll(undefined);
            setIsFetching(true);
            const _poll = await everscale('getPollDetails', {address, created});
            setPoll(_poll);
            console.debug('[POLL DETAILS]:', _poll)
        } catch (e: any) {
            console.error(e.message);
        } finally {
            setIsFetching(false);
        }
    }, [everscale, address, created]);

    /**
     * Effect
     * Props change
     */
    useEffect(() => {
        setAddress(props.address ?? '');
        setCreated(props.created?.toString() ?? '0');
    }, [props.address, props.created]);

    /**
     * Effect
     * Load poll details when props provided
     */
    useEffect(() => {
        if (props.address?.length && props.address === address) getPoll().then();
    }, [props.address, address, getPoll]);

    return (
        <>
            <h4 className={'text-secondary py-3 mb-3 sticky-top bg-white d-flex align-items-center border-bottom'}>
                Poll details
            </h4>

            <Form.Group>
                <InputGroup>
                    <Form.Control
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        placeholder={'Poll contract address'}
                        disabled={isFetching}
                        type={'search'}
                    />
                    <Button
                        variant={'secondary'}
                        disabled={!address || isFetching}
                        onClick={getPoll}
                    >
                        <FontAwesomeIcon icon={isFetching ? faSpinner : faSearch} className={'me-1'}/>
                        Search
                    </Button>
                </InputGroup>
            </Form.Group>

            {poll && (
                <>
                    <PollDetails poll={poll} cardProps={{className: 'mt-4'}}/>
                    {poll.status && (
                        <>
                            <PollVote poll={poll} getPoll={getPoll} cardProps={{className: 'mt-5'}}/>
                            <PollFinish poll={poll} getPoll={getPoll} cardProps={{className: 'mt-5'}}/>
                        </>
                    )}
                </>
            )}
        </>
    );
}

export default PollDetailsView
