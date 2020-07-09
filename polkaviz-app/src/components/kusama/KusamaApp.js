/* eslint-disable */
import React from "react";
import { Stage, Layer, Text, Circle, Rect } from "react-konva";
import { withRouter } from "react-router-dom";
import { WsProvider, ApiPromise } from "@polkadot/api";
import Relay from "../Relay";
import KusamaValidator from "./KusamaValidators";
import KusamaIntention from "./KusamaIntentions";
import BlockAnimationNew from "./BlockAnimation-new";
import Bottombar from "../Bottombar";
import Counter from "../Counter";
import InfoCard from "./InfoCard";
import KusamaKeyStats from "./KusamaKeyStats";
import SpecificInfo from "./SpecificInfo";
class KusamaApp extends React.Component {
  constructor() {
    super();
    this.latestBlockAuthor = undefined;
    this.state = {
      kusamavalidators: [],
      stageWidth: 600,
      kusamalastAuthor: "",
      kusamastart: null,
      kusamaisloading: true,
      kusamavaltotalinfo: [],
      kusamabottombarinfo: {
        eraLength: 0,
        eraProgress: 0,
        sessionLength: 0,
        sessionProgress: 0,
      },
      kusamatotalValidators: 0,
      kusamafinalblock: 0,
      kusamaintentions: [],
      kusamavalidatorandintentions: [],
      kusamatotalIssued: "",
      ValidatorsData: [],
      IntentionsData: [],
      specificInfo: {},
      specificIntentionInfo: {},
      showFirstViewInstructions: true,
      showInfoCard: false,
    };
    this.ismounted = true;
  }

  componentDidMount() {
    // window.location.reload()
    this.serverApi();
    this.polkaApi();
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (
      this.state.kusamavalidators !== nextState.kusamavalidators ||
      this.state.kusamavalidatorandintentions !==
        nextState.kusamavalidatorandintentions ||
      this.state.kusamalastAuthor !== nextState.kusamalastAuthor ||
      this.state.kusamafinalblock !== nextState.kusamafinalblock ||
      this.state.kusamabottombarinfo !== nextState.kusamabottombarinfo ||
      this.state.kusamaisloading !== nextState.kusamaisloading ||
      this.state.ValidatorsData !== nextState.ValidatorsData ||
      this.state.specificValidatorInfo !== nextState.specificValidatorInfo ||
      this.state.specificIntentionInfo !== nextState.specificIntentionInfo
    )
      return true;
    return false;
  }
  componentWillUnmount() {
    window.removeEventListener("resize", this.checkSize);
  }

  async serverApi() {
    let arr1 = [];
    let arr2 = [];
    try {
      const validator_response = await fetch(
        "https://yieldscan-api.onrender.com/api/actors/validators"
      );
      const validator_data = await validator_response.json();

      // // Handle validator data
      // if (validator_data && validator_data.length > 0) {
      //   arr1 = JSON.parse(JSON.stringify(validator_data)).map(({ currentValidator, accountIndex }) => {
      //     // console.log(info);
      //     return {
      //       valname: currentValidator.accountId,
      //       valinfo: currentValidator,
      //       accountIndex: accountIndex,

      //     };
      //   });
      //   // console.log('arr1++++++++++', arr1);
      // }

      // // Handle intention data
      // if (intention_data && intention_data.intentions.length > 0) {
      //   // console.log('+++++++++++______+++++++')
      //   // console.log(intention_data.intentions)
      //   const intentionsValname = intention_data.intentions
      //   const intentionsInfo = intention_data.info
      //   const arr2 = intentionsValname.map( currentIntention => {
      //     // console.log('currentIntention' + currentIntention);
      //     // console.log('currentIntention index' + JSON.stringify(intentionsValname.indexOf(currentIntention)));
      //     return {
      //       valname: currentIntention,
      //       valinfo: JSON.parse(JSON.stringify(intentionsInfo[intentionsValname.indexOf(currentIntention)])),
      //     };
      //   });
      //   // console.log('arr2++++++++++', arr2);

      //   // set state to render both intention and validators
      //   this.setState({
      //     ValidatorsData: arr1,
      //     IntentionsData: arr2,
      //   });
      // }
      this.setState({
        ValidatorsData: validator_data,
      });
    } catch (err) {
      console.log("err", err);
    }
  }

  // for fetching data from polkadot/api
  async polkaApi() {
    const provider = new WsProvider("wss://kusama-rpc.polkadot.io");
    const api = await ApiPromise.create({ provider });

    await api.derive.chain.subscribeNewHeads((block) => {
      // console.log(`block #${block.author}`);
      const lastAuthor = block.author.toString();
      if (this.ismounted) {
        this.setState({ kusamalastAuthor: lastAuthor });
      }
      const start = new Date();
      const blockNumber = block.number.toString();
      if (this.ismounted) {
        this.setState({
          kusamastart: start,
          kusamafinalblock: blockNumber,
        });
      }
    });

    const balance = await api.query.balances.totalIssuance();
    console.log(balance.toString());
    const totalIssued = (balance.toString() / Math.pow(10, 18)).toFixed(3);
    if (this.ismounted) {
      this.setState({
        kusamatotalIssued: totalIssued,
      });
    }

    const totalValidators = await api.query.staking.validatorCount();
    // console.log("this", totalValidators.words["0"], totalValidators);
    if (this.ismounted) {
      this.setState({
        kusamatotalValidators: totalValidators.words["0"],
      });
    }

    if (this.state.ValidatorsData.length === 0) {
      await api.query.session.validators((validators) => {
        // console.log('query session validators ' + validators)
        const sessionValidators = validators.map((x) => {
          return {
            valname: x.toString(),
            // valinfo:
          };
        });
        // console.log(sessionValidators)
        if (this.ismounted) {
          this.setState({
            ValidatorsData: sessionValidators,
            kusamaisloading: false,
          });
        }
      });

      let validatorstotalinfo = await Promise.all(
        this.state.ValidatorsData.map((val) =>
          api.derive.staking.account(val.valname)
        )
      );

      // console.log('++++validatorstotalinfo++++' + JSON.parse(JSON.stringify(validatorstotalinfo)));

      validatorstotalinfo = JSON.parse(JSON.stringify(validatorstotalinfo)).map(
        (info) => {
          // console.log(info);
          return {
            valname: info.accountId,
            valinfo: info,
          };
        }
      );

      this.setState({
        ValidatorsData: validatorstotalinfo,
      });

      const indexes = await api.derive.accounts.indexes();
      const newArr = validatorstotalinfo.map((validator) => {
        const indexKey = validator.valname;
        return {
          ...validator,
          accountIndex: indexes[indexKey],
        };
      });
      // console.log('newArr+++++_________')
      // console.log(JSON.stringify(newArr))
      this.setState({
        ValidatorsData: newArr,
      });
    }

    // if (this.state.IntentionsData.length === 0) {
    //   let stakingValidators = await api.query.staking.validators();
    //   stakingValidators = JSON.parse(JSON.stringify(stakingValidators))[0];

    //   // console.log('++++stakingValidators++++' + stakingValidators);
    //   const activeValidators = this.state.ValidatorsData.map(ele => ele.valname);
    //   // console.log('++++activeValidators++++' + activeValidators);
    //   const intentions = stakingValidators.filter(e => !activeValidators.includes(e));
    //   // console.log('++++intentions++++' + intentions);
    //   const intentionsObject = intentions.map(x => {
    //     return {
    //       valname: x.toString(),
    //       // valinfo:
    //     };
    //   });
    //   // console.log('++++intentions++++' + intentionsObject);
    //   this.setState({
    //     IntentionsData: intentionsObject,
    //   });
    //   const getIntentionsAccountInfo = await Promise.all(
    //     intentions.map(val => api.derive.staking.account(val)),
    //   );
    //   const indexes = await api.derive.accounts.indexes();
    //   const intentionstotalinfo = JSON.parse(JSON.stringify(getIntentionsAccountInfo)).map(info => {
    //     // console.log('intention info'+ JSON.stringify(info))
    //     return {
    //       valname: info.accountId,
    //       valinfo: info,
    //       accountIndex: indexes[info.accountId],
    //     };
    //   });
    //   this.setState({
    //     IntentionsData: intentionstotalinfo,
    //   });

    // }
    // console.log(intentions.toJSON())
    await api.derive.session.info((header) => {
      console.log("header" + JSON.stringify(header));
      // header{"activeEra":728,"activeEraStart":1588138074000,"currentEra":728,"currentIndex":3662,"eraLength":3600,"isEpoch":true,"sessionLength":600,"sessionsPerEra":6,"validatorCount":225}
      console.log(`eraLength #${header.eraLength}`);
      // console.log(`eraProgress #${eraProgress}`);
      console.log(`sessionLength #${header.sessionLength}`);
      // console.log(`sessionProgress #${sessionProgress}`);
      const eraLength = header.eraLength.toString();
      // const eraProgress = header.eraProgress.toString();
      const sessionLength = header.sessionLength.toString();
      // const sessionProgress = header.sessionProgress.toString();
      // console.log(eraLength,eraProgress,sessionLength,sessionProgress)
      if (this.ismounted) {
        this.setState(
          {
            kusamabottombarinfo: {
              eraLength,
              sessionLength,
            },
            kusamaisloading: false,
          }
          // () => this.createApi()
        );
      }
    });

    await Promise.all([
      api.derive.session.sessionProgress((x) => {
        const kusamabottombarinfo = { ...this.state.kusamabottombarinfo };
        console.log(JSON.stringify(kusamabottombarinfo));
        kusamabottombarinfo.sessionProgress = x.toString();
        console.log(JSON.stringify(kusamabottombarinfo));
        if (this.ismounted) {
          this.setState(
            {
              kusamabottombarinfo,
            }
            // () => this.createApi()
          );
        }
      }),
      api.derive.session.eraProgress((x) => {
        const kusamabottombarinfo = { ...this.state.kusamabottombarinfo };
        console.log(JSON.stringify(kusamabottombarinfo));
        kusamabottombarinfo.eraProgress = x.toString();
        console.log(JSON.stringify(kusamabottombarinfo));
        if (this.ismounted) {
          this.setState(
            {
              kusamabottombarinfo,
            }
            // () => this.createApi()
          );
        }
      }),
    ]);
    // console.log('sessionProgress+, eraProgress: ' + sessionProgress+ ', '+  eraProgress)
    // console.log('state.kusamabottombarinfo: '+ JSON.stringify(this.state.kusamabottombarinfo))

    // console.log('state.kusamabottombarinfo: '+ JSON.stringify(this.state.kusamabottombarinfo))
  }

  componentWillUnmount() {
    this.ismounted = false;
  }

  handlePolkavizClick = () => {
    document.body.style.cursor = "default";
    this.props.history.push({
      pathname: "/",
    });
  };

  setSpecificInfo = (info) => {
    // console.log("validator info", info);
    this.setState({
      specificIntentionInfo: {},
      specificInfo: info,
      showFirstViewInstructions: false,
    });
  };

  onIntentionHover = (info) => {
    // console.log("intention info", info);
    //check if specific validator info's length is more than 1
    //then empty it
    //and then set the info parameter label to specific intention info
    this.setState({
      setSpecificInfo: {},
      specificIntentionInfo: info,
      showFirstViewInstructions: false,
    });
  };

  handleOnMouseOver = (e) => {
    e.target.setAttrs({
      scaleX: 1.4,
      scaleY: 1.4,
    });
    document.body.style.cursor = "pointer";
    this.setState({ showInfoCard: true });
  };
  handleOnMouseOut = (e) => {
    e.target.setAttrs({
      scaleX: 1,
      scaleY: 1,
    });
    document.body.style.cursor = "default";
    this.setState({ showInfoCard: false });
  };
  handleClick = () => {
    document.body.style.cursor = "default";
    if (!this.props.isKusama) {
      this.props.history.push({
        pathname: "/alexander/validator/" + this.props.validatorAddress,
        state: { totalinfo: this.props.totalinfo, valinfo: this.props.valinfo },
      });
    }

    if (this.props.isKusama) {
      console.log("clicked!");
      window.open(
        `https://polkanalytics.com/#/kusama/validator/${this.props.validatorAddress}`
      );
    }
  };

  render() {
    // TODO: Remove not in use variables/contants
    const commonWidth = this.state.stageWidth;
    const commonHeight = this.state.stageWidth;
    const {
      IntentionsData,
      ValidatorsData,
      specificValidatorInfo,
      specificIntentionInfo,
    } = this.state;
    // console.table(this.state)
    // console.log(this.state.kusamavalidators,"vals")
    console.count("kusama rendered");
    const authorIndex = this.state.ValidatorsData.findIndex(
      (p) => p.valname == this.state.kusamalastAuthor
    );
    // console.log('authorIndex' + authorIndex)
    // console.log('this.state.ValidatorsData.length: '+this.state.ValidatorsData.length)
    const arr = this.state.ValidatorsData;

    const intentionsarr = this.state.kusamaintentions;
    const bottombarobject2 = {
      bottombarinfo: this.state.kusamabottombarinfo,
      finalblock: this.state.kusamafinalblock,
      validatorcount: this.state.kusamatotalValidators,
      totalIssued: `${this.state.kusamatotalIssued.toString()} M`,
    };

    const keyStats = {
      validatorCount: this.state.ValidatorsData.length,
      validatorTotalCount: this.state.kusamatotalValidators,
      finalBlock: this.state.kusamafinalblock,
      lastBlockCounter: this.state.kusamastart,
      eraProgress: this.state.kusamabottombarinfo.eraProgress,
      eraLength: this.state.kusamabottombarinfo.eraLength,
      sessionProgress: this.state.kusamabottombarinfo.sessionProgress,
      sessionLength: this.state.kusamabottombarinfo.sessionLength,
      totalIssued: `${this.state.kusamatotalIssued.toString()} M`,
    };

    return this.state.ValidatorsData.length === 0 ? (
      <>
        <div className="lds-ripple">
          <div />
          <div />
        </div>
      </>
    ) : (
      <div className="kusamacontainer">
        {/* <div className="heading">
          <h2>Kusama Network</h2>
        </div> */}

        <div className="nav-path" style={{
              border: "1px solid blue",
            }}>
          <div className="nav-path-link" onClick={this.handlePolkavizClick}>
            Polkaviz
          </div>
          <div>/</div>
          <div className="nav-path-current">Kusama</div>
        </div>

        <div className="network-stats" style={{
              border: "1px solid yellow",
            }}>
        <KusamaKeyStats keyStats={keyStats} />
        </div>

        <div className="relay-circle" style={{
              border: "1px solid green",
            }}>
          <div
            id="main-viz"
            style={{
              width: this.state.stageWidth,
              height: this.state.stageWidth,
              border: "1px solid grey",
            }}
          >
            <Stage width={this.state.stageWidth} height={this.state.stageWidth}>
              <Layer>
                {/* <Parachains x={window.innerWidth} y={window.innerHeight} parachains={arr1}/> */}
                {/* in  (90 - 1) "-1"  is to handle the deviation of hexagon wrt to validators */}
                {ValidatorsData.map((person, index) => (
                  <KusamaValidator
                    key={index}
                    onValidatorHover={this.onValidatorHover}
                    name={person.name}
                    stashId={person.stashId}
                    nomCount={person.numOfNominators}
                    rewardsPer100KSM={person.rewardsPer100KSM}
                    commission={person.commission}
                    othersStake={person.othersStake}
                    ownStake={person.ownStake}
                    handleOnMouseOver={this.handleOnMouseOver}
                    setSpecificInfo={this.setSpecificInfo}
                    handleOnMouseOut={this.handleOnMouseOut}
                    riskScore={person.riskScore}
                    estimatedPoolReward={person.estimatedPoolReward}
                    angle={180 - (index * 360) / ValidatorsData.length}
                    history={this.props.history}
                    intentions={[]}
                    x={
                      commonWidth +
                      500 *
                        Math.cos(
                          (90 - 1 - (index * 360) / ValidatorsData.length) *
                            0.0174533
                        )
                    }
                    y={
                      commonHeight +
                      500 *
                        Math.sin(
                          (90 - 1 - (index * 360) / ValidatorsData.length) *
                            0.0174533
                        )
                    }
                    isKusama
                  />
                ))}
                {IntentionsData.map((person, index) => (
                  <KusamaIntention
                    key={index}
                    onIntentionHover={this.onIntentionHover}
                    validatorAddress={person.valname}
                    valinfo={person.valinfo}
                    totalinfo={this.state.kusamavaltotalinfo}
                    nominatorinfo={this.state.kusamanominatorinfo}
                    angle={180 - (index * 360) / IntentionsData.length}
                    history={this.props.history}
                    intentions={IntentionsData}
                    x={
                      commonWidth -
                      40 +
                      500 *
                        Math.cos(
                          (90 - 1 - (index * 360) / IntentionsData.length) *
                            0.0174533
                        )
                    }
                    y={
                      commonHeight +
                      500 *
                        Math.sin(
                          (90 - 1 - (index * 360) / IntentionsData.length) *
                            0.0174533
                        )
                    }
                    isKusama
                  />
                ))}
                {/* {console.log(this.state.bottombarobject.finalblock)}
              {console.log(this.state.previousBlock)} */}
                <BlockAnimationNew
                  key={authorIndex}
                  angle={180 - (authorIndex * 360) / arr.length}
                  x1={
                    commonWidth / 2 +
                    160 *
                      Math.cos(
                        (90 - (authorIndex * 360) / arr.length) * 0.0174533
                      )
                  }
                  y1={
                    commonHeight / 2 +
                    160 *
                      Math.sin(
                        (90 - (authorIndex * 360) / arr.length) * 0.0174533
                      )
                  }
                  x2={
                    commonWidth / 2 +
                    240 *
                      Math.cos(
                        (90 - (authorIndex * 360) / arr.length) * 0.0174533
                      )
                  }
                  y2={
                    commonHeight / 2 +
                    240 *
                      Math.sin(
                        (90 - (authorIndex * 360) / arr.length) * 0.0174533
                      )
                  }
                />
                <Relay x={commonWidth} y={commonHeight} isKusama />
                <Text
                  text={
                    this.state.showFirstViewInstructions &&
                    "Hover over validators \n and intentions to see info"
                  }
                  x={commonWidth - 730}
                  y={commonHeight - 420}
                  fontFamily="Roboto Mono"
                  fill="#FFFFFF"
                  fontSize={20}
                  align="center"
                />
                {this.state.showInfoCard && (
                  <InfoCard
                    specificInfo={this.state.specificInfo}
                    showInfoCard={this.state.showInfoCard}
                  />
                )}
              </Layer>
            </Stage>
          </div>
        </div>
        <div
          id="validator-types-info"
          style={{
            width: this.state.stageWidth,
            border: "1px solid grey"
          }}
        >
          <Stage width={500} height={200}>
            <Layer>
              <Circle
                x={150}
                y={200 - 190}
                radius={10}
                fill="#FFEB3B"
              />
              <Text
                x={165}
                y={200 - 195}
                text="Waiting Validators"
                fill={this.props.colorMode === "light" ? "#1A202C" : "#718096"}
                fontSize={15}
              />
              <Circle
                x={150}
                y={200 - 160}
                radius={10}
                fill="#C31169"
              />
              <Text
                x={165}
                y={200 - 165}
                text="Active Validators"
                fill={this.props.colorMode === "light" ? "#1A202C" : "#718096"}
                fontSize={15}
              />
            </Layer>
          </Stage>
        </div>
      </div>
    );
  }
}

export default withRouter(KusamaApp);
