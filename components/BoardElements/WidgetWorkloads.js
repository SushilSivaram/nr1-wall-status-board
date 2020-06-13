import React, { Component,  } from 'react';
import PropTypes from 'prop-types';
import { StatusBlock, BreakdownBlock } from './';
import {NerdGraphQuery} from 'nr1';
const gql = require( '../../components/BoardElements/query.js');



export default class WidgetWorkloads extends Component {
    static propTypes = {
        accountId: PropTypes.number.isRequired,
        autoRefresh: PropTypes.number.isRequired,
        }

    constructor(props) {
        super(props);
        this.state = {data: null}
    }

    async componentDidMount() {
        this.loadData()
        this.autoRefresh = setInterval(() => this.loadData(), this.props.autoRefresh ? this.props.autoRefresh*1000 : 60*1000) //auto refresh 1 minute;
    }

    componentDidUpdate(prevProps) {
        if (prevProps.pageRef!==this.props.pageRef){
            this.setState({data: null})
            this.loadData()

        }
    }

    componentWillUnmount() {
        clearInterval(this.autoRefresh);
    }

    async loadData() {
        const { config } = this.props
        const { wlName, wlQuery, wlThresholdCriticalAlerts, wlThresholdCriticalWarnings, wlThresholdWarningAlerts, wlThresholdWarningWarnings} = config

        let accountId = config.wlAccountId ? config.wlAccountId : this.props.accountId;
 
        let collectionId = 0; //unknown
        let NotAlertingEntities = [];
        let CriticalEntities = [];
        let WarningEntities = [];
        let status = "N";

    
        const variables = {
            id: Number(accountId)
        }       
        
        let x = await NerdGraphQuery.query({ query: gql.workloadGuidQuery(accountId) });

        if(x.errors) {
            console.log(x.errors)
        } else {
            x.data.actor.account.workload.collections.forEach(collection => {
                if(collection.name == wlName) {
                    collectionId = collection.guid;
                }
            }
            )
            if(config.wlDebugMode===true) {
                console.log(`DEBUG MODE ENABLED: ${config.wlName} collectionId`,collectionId)
            }
    
            if(collectionId != 0) {
                let collectionEntity = await NerdGraphQuery.query({query: gql.workloadEntityQuery(accountId, collectionId)});
                
                if(collectionEntity.errors) {
                    console.log(collectionEntity.errors)
                } else {
                    let entitySearchQuery = (wlQuery && wlQuery.length > 1) ? collectionEntity.data.actor.account.workload.collection.entitySearchQuery+' AND '+wlQuery : collectionEntity.data.actor.account.workload.collection.entitySearchQuery;
                    if(config.wlDebugMode===true) {
                        console.log(`DEBUG MODE ENABLED: ${config.wlName} searchQuery`,entitySearchQuery)
                    }
                            let entitySearch = await NerdGraphQuery.query({query: gql.entitiesAlerting(accountId,entitySearchQuery)});

                    if(entitySearch.errors) {
                        console.log(entitySearch.errors)
                    } else {
                        entitySearch.data.actor.entitySearch.results.entities.forEach(entity => {
                            switch(entity.alertSeverity) {
                                case "CRITICAL":
                                    CriticalEntities.push(entity);
                                    break;
                                case "WARNING":
                                    WarningEntities.push(entity)
                                    break;
                                default:
                                    NotAlertingEntities.push(entity)
                                }
                        })

                        let criticalPerc = (CriticalEntities.length / NotAlertingEntities.length) * 100
                        let warningPerc = (WarningEntities.length / NotAlertingEntities.length) * 100

                        //set status based on warnings
                        if(warningPerc > wlThresholdWarningWarnings) {
                            status="W"
                        }
                        if(warningPerc > wlThresholdCriticalWarnings) {
                            status="C"
                        } 

                        //set status based on alerts (critical entities)
                        if(criticalPerc > wlThresholdWarningAlerts && status=="N") {
                            status="W"
                        }
                        if(criticalPerc > wlThresholdCriticalAlerts) {
                            status="C"
                        } 

                    }
                }
            }
        }
        if(config.wlDebugMode===true) {
            console.log(`DEBUG MODE ENABLED: ${config.wlName}`,status)
        }
                            let data = {
                                    "current": status,
                                    "breakdown": {critical:CriticalEntities.length, warning:WarningEntities.length, normal:NotAlertingEntities.length}
                                }
                                
                                this.setState({ data: data  })
                    
    }





    render() {
        let {config} = this.props
        let {wlTitle, wlLink, wlShowPercentages } = config
        let {data} = this.state


        if(data) {
            let {current, breakdown} = data

            console.log("breakdown",breakdown)

            return <BreakdownBlock title={wlTitle} status={current} breakdown={breakdown} showPercentages={wlShowPercentages} link={wlLink}/>
        } else {
            return <><BreakdownBlock title={wlTitle} /></>
        }
       
        
    }
}
