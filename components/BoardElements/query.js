module.exports = {

    workloadGuidQuery: (accountId) => {
        return `
        {
            actor {
                account(id: ${accountId}) {
                  id
                  workload {
                    collections {
                      guid
                      name
                    }
                  }
                }
              }
            }
  `
    },
      
    workloadEntityQuery: (accountId, collectionGuid) => {
      return `
      {
        actor {
            account(id: ${accountId}) {
              id
              workload {
                collection(guid: "${collectionGuid}") {
                  entitySearchQuery
                  entities {
                    guid
                  }
                }
              }
            }
          }
        }
`
    },

// If there are more than 25 entities, the following needs to be in a pagination loop
    entitiesAlerting: (accountId, query) => {
      return `
      {
        actor {
            account(id: ${accountId}) {
                name
            }
            entitySearch(query: "${query}") {
                results {
                    entities {
                        ... on AlertableEntityOutline {
                            alertSeverity
                        }
                        name
                        guid
                    }
                }
            }
        }
      }
`
    }
};