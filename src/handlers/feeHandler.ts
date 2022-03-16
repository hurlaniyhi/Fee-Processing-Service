import { Request, Response } from 'express'
import { FeeConfigResponse, FeeComputationResponse } from '@models';
import helpers from '@utility'
import fs from'fs';

const feeConfigurationSetup = (req: Request, res: Response) => {
    const response = <FeeConfigResponse>{}
    var {FeeConfigurationSpec} = req.body

    // Check if fee configuration setting is passed with a value
    if (!FeeConfigurationSpec) {
        response.error = "No fee configuration is provided"
        return res.status(400).send(response)
    }

    try {
        // Format the fee configuraion settings to a readable format
        FeeConfigurationSpec = FeeConfigurationSpec.replace(/\(/g, " ").replace(/\)|APPLY\s|:\s/g, "");
        
        // Convert fee configuration setting to an array of strings
        const feeConfigArr = FeeConfigurationSpec.split('\n')
        
        //Store the formated configuration in store.json file
        const dataToStore = JSON.stringify(feeConfigArr, null, 2);
        fs.writeFileSync('store.json', dataToStore);

        response.status = "ok"
        return res.status(200).send(response);
    }
    catch (err: any) {
        response.error = `Something went wrong: ${err}`
        res.status(500).send(response);
    }
}

const feeComputation = (req: Request, res: Response) => {
    var response = <FeeComputationResponse>{}
    const paymentData = req.body

    try {
        // Get/Read the configuration settings stored in store.json file
        const storedData: any = fs.readFileSync('store.json');
        const feeConfigSettings: Array<string> = JSON.parse(storedData);

        // Get fee configurations that can be applied to the given transaction
        const matchedConfigs = helpers.getMatchedConfiguration(paymentData, feeConfigSettings)

        // Check if there are configurations applicable to the given transaction
        if(!matchedConfigs.length) {
            response.Error = 'No fee configuration is applicable to this transaction'
            return res.status(400).send(response)
        }

        // Get the most specific configuration from the matched fee configurations 
        // that can be applied to the given transaction. 
        var specificFeeConfig: Array<string>;
        if(matchedConfigs.length > 1) specificFeeConfig = helpers.getSpecificFeeConfig(matchedConfigs)
        else specificFeeConfig = matchedConfigs[0].split(' ')

        const [feeId, , , , , feeType, feeValue] = specificFeeConfig

        // Conpute the applied fee and the amount to charge
        const appliedFee = helpers.getAppliedFee(feeType, feeValue, paymentData.Amount)
        const amountCharged = paymentData.Amount + (paymentData.Customer.BearsFee ? appliedFee : 0)

        response = {
            AppliedFeeID: feeId,
            AppliedFeeValue: appliedFee,
            ChargeAmount: amountCharged,
            SettlementAmount: amountCharged - appliedFee
        }
        res.status(200).send(response)
    }
    catch (err: any) {
        response.Error = `Something went wrong: ${err}`
        return res.status(500).send(response)
    }
}

export default {
    feeConfigurationSetup,
    feeComputation
}