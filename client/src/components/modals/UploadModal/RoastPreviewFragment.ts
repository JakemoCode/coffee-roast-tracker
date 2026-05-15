import { graphql } from "../../../graphql/graphql";

export const ROAST_PREVIEW_FIELDS = graphql(`
  fragment RoastPreviewFields on RoastLogPreview @_unmask {
    roastDate
    ambientTemp
    roastingLevel
    profileShortName
    profileDesigner
    colourChangeTime
    firstCrackTime
    roastEndTime
    developmentPercent
    totalDuration
    suggestedBeans {
      id
      shortName
      bean { id name }
    }
    communityBeans {
      id
      name
    }
    parseWarnings
    existingRoastId
  }
`);
