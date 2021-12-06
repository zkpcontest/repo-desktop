import React from "react";
import {Card, CardProps, Col, Row, Spinner, Table} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {EVoterStatus, IPoll} from "devex-common/types";
import {faCalendarPlus, faCalendarCheck, faInfo, faKey, faUsers} from "@fortawesome/free-solid-svg-icons";
import {shortenString} from "../../utils";
import moment from "moment";
import {Doughnut} from 'react-chartjs-2';
import randomColor from "randomcolor";


interface IDetailsItemProps {
    icon?: any;
    label: any;
    content: any;
}

const DetailsItem = (props: IDetailsItemProps) => {
    const {icon, label, content} = props;

    return (
        <div className={'d-flex flex-row align-items-center py-2'}>
            {Boolean(icon) && (<div className={'me-2 text-secondary'}>{icon}</div>)}
            <div>
                <div className={'small text-secondary'}>{label}</div>
                <div>{content}</div>
            </div>
        </div>
    );
}


interface IPollMetaProps {
    poll: IPoll;
    cardProps?: CardProps;
}

const PollDetails = (props: IPollMetaProps) => {
    const {poll, cardProps} = props;

    /**
     * Generate voters chart data
     */
    const voterChartData = {
        labels: [
            EVoterStatus[EVoterStatus.NotVoted],
            EVoterStatus[EVoterStatus.Voted],
        ],
        datasets: [
            {
                data: [
                    Object.keys(poll.voters?.detailed || {}).filter(value => {
                        if (!poll.voters) return false;
                        return [EVoterStatus.NotExist, EVoterStatus.NotVoted].indexOf(+poll.voters.detailed[value]) >= 0
                    }).length,
                    Object.keys(poll.voters?.detailed || {}).filter(value => {
                        if (!poll.voters) return false;
                        return +poll.voters.detailed[value] === EVoterStatus.Voted;
                    }).length
                ],
                backgroundColor: [
                    '#5bc0de',
                    '#5cb85c'
                ],
                borderWidth: 1,
            },
        ]
    }

    /**
     * Calculate poll results and generate vote chart data
     */
    const getVoteChartData = () => {
        // Calculate chart datasets' data (answer => count)
        const results: {[key: string]: any} = {};
        const answers = poll.answers?.map((answer) => answer.utf8);
        poll.votes?.forEach((vote) => {
            vote.decrypted?.split('|').forEach(answer => {
                if (answers && answers.indexOf(answer) >= 0) results[answer] = (results[answer] ?? 0) + 1;
            });
        });

        return {
            labels: !poll.answers
                ? []
                : poll.answers.map((answer) => answer.utf8),
            datasets: [
                {
                    data: answers ? answers.map(answer => results[answer]) : [],
                    backgroundColor: randomColor({
                        seed: '0x0000',
                        count: poll.answers?.length || 1
                    }),
                    borderWidth: 1,
                },
            ]
        }
    }

    return (
        <Card {...cardProps}>
            <Card.Header>
                <Card.Title className={'m-0'}>Details</Card.Title>
            </Card.Header>
            <Card.Body>
                <Row className={'flex-nowrap'}>
                    <Col xs={4} className={'border-end border-bottom'}>
                        <DetailsItem
                            label={'Created'}
                            content={moment(poll.created).toDate().toDateString()}
                            icon={<FontAwesomeIcon icon={faCalendarPlus} size={'lg'} fixedWidth={true}/>}
                        />
                    </Col>
                    <Col xs={4} className={'border-end border-bottom'}>
                        <DetailsItem
                            label={'Ends'}
                            content={poll.ending && moment(poll.ending).toDate().toDateString()}
                            icon={<FontAwesomeIcon icon={faCalendarCheck} size={'lg'} fixedWidth={true}/>}
                        />
                    </Col>
                    <Col xs={4} className={'border-bottom'}>
                        <DetailsItem
                            label={'Status'}
                            content={(
                                <div className={`d-flex align-items-center text-${poll.status ? 'warning' : 'success'}`}>
                                    {poll.status && (
                                        <Spinner
                                            animation={'border'}
                                            size={'sm'}
                                            variant={'warning'}
                                            className={'me-2'}
                                        />
                                    )}
                                    {poll.status ? 'Ongoing' : 'Finished'}
                                </div>
                            )}
                            icon={<FontAwesomeIcon icon={faInfo} size={'lg'} fixedWidth={true}/>}
                        />
                    </Col>
                </Row>

                <Row className={'flex-nowrap'}>
                    <Col xs={4} className={'border-end'}>
                        <DetailsItem
                            label={'RSA secret (hash/key)'}
                            content={(
                                <>
                                    <div>
                                        {poll.privateKey?.hash && shortenString(poll.privateKey.hash)}
                                    </div>
                                    <div>
                                        {poll.privateKey?.hex
                                            ? shortenString(poll.privateKey.hex)
                                            : <span className={'text-warning'}>Key is not available yet</span>
                                        }
                                    </div>
                                </>
                            )}
                            icon={<FontAwesomeIcon icon={faKey} size={'lg'} fixedWidth={true}/>}
                        />
                    </Col>
                    <Col xs={4} className={'border-end'}>
                        <DetailsItem
                            label={'ZKP keys (proof/verify)'}
                            content={(
                                <>
                                    <div>{poll.proofKey && shortenString(poll.proofKey)}</div>
                                    <div>{poll.verifyingKey && shortenString(poll.verifyingKey)}</div>
                                </>
                            )}
                            icon={<FontAwesomeIcon icon={faKey} size={'lg'} fixedWidth={true}/>}
                        />
                    </Col>
                    <Col xs={4}>
                        <DetailsItem
                            label={'Voted'}
                            content={`${poll.voters?.voted} / ${poll.voters?.total}`}
                            icon={<FontAwesomeIcon icon={faUsers} size={'lg'} fixedWidth={true}/>}
                        />
                    </Col>
                </Row>

                <Row className={'mt-5'}>
                    <Col xs={7} lg={4}>
                        <Doughnut
                            data={voterChartData}
                            options={{
                                aspectRatio: 1.3,
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        align: 'center'
                                    }
                                }
                            }}
                        />
                    </Col>
                    <Col xs={5} lg={8}>
                        <Table size={'sm'} className={'small'}>
                            <thead>
                            <tr>
                                <th>Voter</th>
                                <th>Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {poll.voters && Object.keys(poll.voters.detailed).map(voter => (
                                <tr key={voter}>
                                    <td>{shortenString(voter)}</td>
                                    <td>{poll.voters && EVoterStatus[poll.voters.detailed[voter]]}</td>
                                </tr>
                            ))}
                            </tbody>
                        </Table>
                    </Col>
                </Row>

                <Row className={'mt-5'}>
                    <Col xs={7} lg={4}>
                        <Doughnut
                            data={getVoteChartData()}
                            options={{
                                aspectRatio: 1.3,
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        align: 'center'
                                    }
                                }
                            }}
                        />
                    </Col>
                    <Col xs={5} lg={8}>
                        <Table size={'sm'} className={'small'}>
                            <thead>
                            <tr>
                                <th>Vote</th>
                                <th>Decrypted</th>
                            </tr>
                            </thead>
                            <tbody>
                            {poll.votes?.length
                                ? poll.votes.map((vote, index) => (
                                    <tr key={index}>
                                        <td>{shortenString(vote.encrypted)}</td>
                                        <td>{vote.decrypted || 'Poll is not finished'}</td>
                                    </tr>
                                ))
                                : (
                                    <tr>
                                        <td colSpan={2} className={'text-muted'}>No votes yet</td>
                                    </tr>
                                )
                            }
                            </tbody>
                        </Table>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
}

export default PollDetails;
