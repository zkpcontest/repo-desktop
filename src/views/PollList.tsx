import React, {useEffect, useState} from "react";
import {IPoll} from "devex-common/types";
import {Alert, Button, Nav, Spinner, Table} from "react-bootstrap";
import {shortenString} from '../utils';
import {IActiveTab} from "../App";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSync} from "@fortawesome/free-solid-svg-icons";
import moment from "moment";


interface IPollListViewProps {
    setActiveTab: React.Dispatch<React.SetStateAction<IActiveTab | undefined>>;
    isActive: boolean;
}

const PollListView = (props: IPollListViewProps) => {
    const {setActiveTab, isActive} = props;
    const {everscale} = (window as any).electron;
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const [polls, setPolls] = useState<IPoll[]>();

    /**
     * Get list of existing polls
     */
    const getPollList = React.useCallback( async () => {
        setIsFetching(true);
        try {
            const _polls = await everscale('getPollList');
            setPolls(_polls);
        } catch (e: any) {
            console.error(e.message)
        } finally {
            setIsFetching(false);
        }
    }, [everscale]);

    /**
     * Render polls table row
     * @param poll
     * @param index
     */
    const renderPollRow = (poll: IPoll, index: number) => {
        if (poll.status === undefined) return (
            <tr key={index}>
                <td>{shortenString(poll.address)}</td>
                <td colSpan={4} className={'text-danger'}>Poll read error</td>
            </tr>
        );

        return (
            <tr key={index}>
                <td>
                    <Nav.Link
                        className={'p-0'}
                        onClick={() => {
                            setActiveTab({
                                id: 'pollDetails',
                                props: {
                                    address: poll.address,
                                    created: poll.created / 1000
                                }
                            })
                        }}
                    >
                        {shortenString(poll.address)}
                    </Nav.Link>
                </td>
                <td className={'text-nowrap'}>{moment(poll.created).toDate().toDateString()}</td>
                <td className={'text-nowrap'}>
                    {poll.ending && moment(poll.ending).toDate().toDateString()}
                </td>
                <td className={'text-nowrap'}>{poll.voters?.voted} / {poll.voters?.total}</td>
                <td className={'align-center text-nowrap'}>
                    {!poll.status
                        ? <span className={'text-success'}>Finished</span>
                        : (
                            <div className={'text-warning d-flex align-items-center'}>
                                <Spinner animation={'border'} size={'sm'} variant={'warning'}/>
                                <span className={'ms-2'}>Ongoing</span>
                            </div>
                        )
                    }
                </td>
            </tr>
        );
    }

    /**
     * Effect when to load/reload polls
     */
    useEffect(() => {
        if (isActive && !polls) getPollList().then();
    }, [getPollList, polls, isActive]);

    return (
        <>
            <h4 className={'text-secondary py-3 mb-3 sticky-top bg-white d-flex align-items-center border-bottom'}>
                Polls list
                <Button
                    onClick={getPollList}
                    disabled={isFetching}
                    variant={'outline-secondary'}
                    size={'sm'}
                    className={'ms-2'}
                >
                    <FontAwesomeIcon icon={faSync} spin={isFetching}/>
                </Button>
            </h4>

            {!isFetching && polls !== undefined && !polls?.length && (
                <Alert variant={'info'} className={'m-0'}>No polls created yet</Alert>
            )}

            {Boolean(polls?.length) && (
                <Table responsive={true} className={'small'}>
                    <thead>
                    <tr>
                        <th>Address</th>
                        <th>Created</th>
                        <th>Ending</th>
                        <th>Votes</th>
                        <th>Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    {polls?.map((poll, index) => renderPollRow(poll, index))}
                    </tbody>
                </Table>
            )}
        </>
    );
}

export default PollListView
