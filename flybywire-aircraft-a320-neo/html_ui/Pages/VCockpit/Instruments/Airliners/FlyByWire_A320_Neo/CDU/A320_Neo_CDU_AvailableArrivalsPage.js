/*
 * A32NX
 * Copyright (C) 2020-2021 FlyByWire Simulations and its contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * translates MSFS navdata approach type to honeywell ordering
 */
const ApproachTypeOrder = Object.freeze([
    // MLS
    ApproachType.APPROACH_TYPE_ILS,
    // GLS
    // IGS
    ApproachType.APPROACH_TYPE_LOCALIZER,
    ApproachType.APPROACH_TYPE_LOCALIZER_BACK_COURSE,
    ApproachType.APPROACH_TYPE_LDA,
    ApproachType.APPROACH_TYPE_SDF,
    ApproachType.APPROACH_TYPE_GPS,
    ApproachType.APPROACH_TYPE_RNAV,
    ApproachType.APPROACH_TYPE_VORDME,
    ApproachType.APPROACH_TYPE_VOR,
    ApproachType.APPROACH_TYPE_NDBDME,
    ApproachType.APPROACH_TYPE_NDB,
    ApproachType.APPROACH_TYPE_UNKNOWN, // should be "runway by itself"...
]);

class CDUAvailableArrivalsPage {
    static ShowPage(mcdu, airport, pageCurrent = 0, starSelection = false) {
        const selectedStarIndex = mcdu.flightPlanManager.getArrivalProcIndex();
        const airportInfo = airport.infos;
        if (airportInfo instanceof AirportInfo) {
            mcdu.clearDisplay();
            mcdu.page.Current = mcdu.page.AvailableArrivalsPage;
            let selectedApproachCell = "------";
            let selectedViasCell = "------";
            let selectedTransitionCell = "------";
            let selectedApproachCellColor = "white";
            let selectedViasCellColor = "white";
            let selectedTransitionCellColor = "white";
            const selectedApproach = mcdu.flightPlanManager.getApproach();
            if (selectedApproach && selectedApproach.name) {
                selectedApproachCell = Avionics.Utils.formatRunway(selectedApproach.name);
                selectedApproachCellColor = mcdu.flightPlanManager.getCurrentFlightPlanIndex() === 1 ? "yellow" : "green";
                const selectedApproachTransition = selectedApproach.transitions[mcdu.flightPlanManager.getApproachTransitionIndex()];
                if (selectedApproachTransition) {
                    selectedViasCell = selectedApproachTransition.name;
                } else {
                    selectedViasCell = "NONE";
                }
                selectedViasCellColor = mcdu.flightPlanManager.getCurrentFlightPlanIndex() === 1 ? "yellow" : "green";
            }
            let selectedStarCell = "------";
            let selectedStarCellColor = "white";
            const selectedArrival = mcdu.flightPlanManager.getArrival();
            if (selectedArrival) {
                selectedStarCell = selectedArrival.name;
                selectedStarCellColor = mcdu.flightPlanManager.getCurrentFlightPlanIndex() === 1 ? "yellow" : "green";
                const selectedTransition = selectedArrival.enRouteTransitions[mcdu.flightPlanManager.getArrivalTransitionIndex()];
                if (selectedTransition) {
                    selectedTransitionCell = selectedTransition.name;
                    selectedTransitionCellColor = mcdu.flightPlanManager.getCurrentFlightPlanIndex() === 1 ? "yellow" : "green";
                }
            }
            const approaches = airportInfo.approaches;
            // Add an index member variable so we can track the original order of approaches
            for (let j = 0; j < approaches.length; j++) {
                approaches[j].index = j;
            }
            // Sort the approaches in Honeywell's documented order
            const sortedApproaches = approaches.slice().sort((a, b) => ApproachTypeOrder.indexOf(a.approachType) - ApproachTypeOrder.indexOf(b.approachType));
            const rows = [[""], [""], [""], [""], [""], [""], [""], [""]];
            const matchingArrivals = [];
            if (!starSelection) {
                for (let i = 0; i < 3; i++) {
                    const index = i + pageCurrent;
                    const approach = sortedApproaches[index];
                    if (approach) {
                        const runways = airportInfo.oneWayRunways;
                        const approachRunwayName = Avionics.Utils.formatRunway(approach.name.split(" ")[1] || "0");
                        let runwayLength = 0;
                        let runwayCourse = 0;
                        for (const runway of runways) {
                            const runwayName = Avionics.Utils.formatRunway(runway.designation);
                            if (runwayName.match("^" + approachRunwayName + "C?$")) {
                                runwayLength = runway.length.toFixed(0);
                                const magVar = Facilities.getMagVar(runway.latitude, runway.longitude);
                                runwayCourse = Utils.leadingZeros(Math.round(A32NX_Util.trueToMagnetic(runway.direction, magVar)), 3);
                            }
                        }
                        rows[2 * i] = ["{" + Avionics.Utils.formatRunway(approach.name.replace(/\s+/g, '')) + "[color]cyan", "", "{sp}{sp}{sp}{sp}" + runwayLength + "{small}M{end}[color]cyan"];
                        rows[2 * i + 1] = ["{sp}{sp}{sp}{sp}" + runwayCourse + "[color]cyan"];
                        mcdu.onLeftInput[i + 2] = () => {
                            mcdu.setApproachIndex(approach.index, () => {
                                mcdu.flightPlanManager.setDestinationRunwayIndexFromApproach();
                                CDUAvailableArrivalsPage.ShowPage(mcdu, airport, 0, true);
                            });
                        };
                    }
                }
            } else {
                if (selectedApproach) {
                    const selectedRunway = selectedApproach.runway;
                    for (let i = 0; i < airportInfo.arrivals.length; i++) {
                        const arrival = airportInfo.arrivals[i];
                        if (arrival.runwayTransitions.length) {
                            for (let j = 0; j < arrival.runwayTransitions.length; j++) {
                                const runwayTransition = arrival.runwayTransitions[j];
                                if (runwayTransition) {
                                    // Check if selectedRunway matches a transition on the approach (and also checks for Center runways)
                                    if (runwayTransition.name.match("^RW" + selectedRunway + "C?$")) {
                                        matchingArrivals.push({ arrival: arrival, arrivalIndex: i });
                                    }
                                }
                            }
                        } else {
                            //add the arrival even if it isn't runway specific
                            matchingArrivals.push({ arrival: arrival, arrivalIndex: i });
                        }
                    }
                } else {
                    for (let i = 0; i < airportInfo.arrivals.length; i++) {
                        const arrival = airportInfo.arrivals[i];
                        matchingArrivals.push({ arrival: arrival, arrivalIndex: i });
                    }
                }
                for (let i = 0; i < 3; i++) {
                    let index = i + pageCurrent;
                    if (index === 0) {
                        let color = "cyan";
                        if (!selectedArrival) {
                            color = "green";
                        }
                        rows[2 * i] = ["{NO STAR[color]" + color];
                        mcdu.onLeftInput[i + 2] = () => {
                            mcdu.setArrivalProcIndex(-1, () => {
                                CDUAvailableArrivalsPage.ShowPage(mcdu, airport, 0, true);
                            });
                        };
                    } else {
                        index--;
                        if (matchingArrivals[index]) {
                            const star = matchingArrivals[index].arrival;
                            const starIndex = matchingArrivals[index].arrivalIndex;
                            let color = "cyan";
                            if (selectedStarIndex === starIndex) {
                                color = "green";
                            }
                            rows[2 * i] = ["{" + star.name + "[color]" + color];
                            mcdu.onLeftInput[i + 2] = () => {
                                const destinationRunway = mcdu.flightPlanManager.getDestinationRunway();
                                const arrivalRunwayIndex = destinationRunway ? star.runwayTransitions.findIndex(t => {
                                    return t.name.indexOf("RW" + destinationRunway.designation) !== -1;
                                }) : -1;
                                if (arrivalRunwayIndex !== -1) {
                                    mcdu.flightPlanManager.setArrivalRunwayIndex(arrivalRunwayIndex);
                                }
                                mcdu.setArrivalProcIndex(starIndex, () => {
                                    if (mcdu.flightPlanManager.getApproachIndex() > -1) {
                                        CDUAvailableArrivalsPage.ShowViasPage(mcdu, airport);
                                    } else {
                                        CDUAvailableArrivalsPage.ShowPage(mcdu, airport, 0, true);
                                    }
                                });
                            };
                        }
                    }
                }
                rows[0][1] = "NONE}[color]cyan";
                mcdu.onRightInput[2] = () => {
                    mcdu.setArrivalIndex(selectedStarIndex, -1, () => {
                        CDUAvailableArrivalsPage.ShowPage(mcdu, airport);
                    });
                };
                for (let i = 0; i < 2; i++) {
                    const index = i + pageCurrent;
                    if (selectedArrival) {
                        const transition = selectedArrival.enRouteTransitions[index];
                        if (transition) {
                            const name = transition.name;
                            rows[2 * (i + 1)][1] = name + "}[color]cyan";
                            mcdu.onRightInput[i + 3] = () => {
                                mcdu.setArrivalIndex(selectedStarIndex, index, () => {
                                    CDUAvailableArrivalsPage.ShowPage(mcdu, airport);
                                });
                            };
                        }
                    }
                }
            }
            let viasPageLabel = "";
            let viasPageLine = "";
            if (starSelection) {
                if (selectedApproach) {
                    viasPageLabel = "{sp}APPR";
                    viasPageLine = "<VIAS";
                    mcdu.onLeftInput[1] = () => {
                        CDUAvailableArrivalsPage.ShowViasPage(mcdu, airport, 0);
                    };
                }
            }
            let bottomLine = ["<RETURN"];
            if (mcdu.flightPlanManager.getCurrentFlightPlanIndex() === 1) {
                bottomLine = ["{ERASE[color]amber", "INSERT*[color]amber"];
                mcdu.onLeftInput[5] = async () => {
                    mcdu.eraseTemporaryFlightPlan(() => {
                        CDUFlightPlanPage.ShowPage(mcdu);
                    });
                };
                mcdu.onRightInput[5] = async () => {
                    mcdu.insertTemporaryFlightPlan(() => {
                        mcdu.updateTowerHeadwind();
                        mcdu.updateConstraints();
                        CDUPerformancePage.UpdateThrRedAccFromDestination(mcdu);
                        CDUFlightPlanPage.ShowPage(mcdu);
                    });
                };
            } else {
                mcdu.onLeftInput[5] = () => {
                    CDUFlightPlanPage.ShowPage(mcdu);
                };
            }
            mcdu.setTemplate([
                ["ARRIVAL {small}TO{end} {green}" + airport.ident + "{end}"],
                ["{sp}APPR", "STAR{sp}", "{sp}VIA"],
                [selectedApproachCell + "[color]" + selectedApproachCellColor, selectedStarCell + "[color]" + selectedStarCellColor, "{sp}" + selectedViasCell + "[color]" + selectedViasCellColor],
                [viasPageLabel, "TRANS{sp}"],
                [viasPageLine, selectedTransitionCell + "[color]" + selectedTransitionCellColor],
                [starSelection ? "STARS" : "APPR", starSelection ? "TRANS" : "", "AVAILABLE"],
                rows[0],
                rows[1],
                rows[2],
                rows[3],
                rows[4],
                rows[5],
                bottomLine
            ]);
            let up = false;
            let down = false;
            const maxPage = starSelection ? (selectedArrival ? Math.max(selectedArrival.enRouteTransitions.length - 2, matchingArrivals.length - 2) : matchingArrivals.length - 2) : (pageCurrent, airportInfo.approaches.length - 3);
            if (pageCurrent < maxPage) {
                mcdu.onUp = () => {
                    pageCurrent++;
                    if (pageCurrent < 0) {
                        pageCurrent = 0;
                    }
                    CDUAvailableArrivalsPage.ShowPage(mcdu, airport, pageCurrent, starSelection);
                };
                up = true;
            }
            if (pageCurrent > 0) {
                mcdu.onDown = () => {
                    pageCurrent--;
                    if (pageCurrent < 0) {
                        pageCurrent = 0;
                    }
                    CDUAvailableArrivalsPage.ShowPage(mcdu, airport, pageCurrent, starSelection);
                };
                down = true;
            }
            mcdu.setArrows(up, down, true, true);
            mcdu.onPrevPage = () => {
                CDUAvailableArrivalsPage.ShowPage(mcdu, airport, 0, !starSelection);
            };
            mcdu.onNextPage = mcdu.onPrevPage;
        }
    }
    static ShowViasPage(mcdu, airport, pageCurrent = 0) {
        const airportInfo = airport.infos;
        const selectedStarIndex = mcdu.flightPlanManager.getArrivalProcIndex();
        if (airportInfo instanceof AirportInfo) {
            mcdu.clearDisplay();
            mcdu.page.Current = mcdu.page.AvailableArrivalsPageVias;
            let selectedApproachCell = "---";
            let selectedApproachCellColor = "white";
            let selectedViasCell = "NONE";
            let selectedViasCellColor = "white";
            const selectedApproach = mcdu.flightPlanManager.getApproach();
            if (selectedApproach) {
                selectedApproachCell = Avionics.Utils.formatRunway(selectedApproach.name);
                selectedApproachCellColor = mcdu.flightPlanManager.getCurrentFlightPlanIndex() === 1 ? "yellow" : "green";
                const selectedApproachTransition = selectedApproach.transitions[mcdu.flightPlanManager.getApproachTransitionIndex()];
                if (selectedApproachTransition) {
                    selectedViasCell = selectedApproachTransition.name;
                    selectedViasCellColor = mcdu.flightPlanManager.getCurrentFlightPlanIndex() === 1 ? "yellow" : "green";
                }
            }
            let selectedStarCell = "------";
            let selectedStarCellColor = "white";
            const selectedArrival = airportInfo.arrivals[selectedStarIndex];
            if (selectedArrival) {
                selectedStarCell = selectedArrival.name;
                selectedStarCellColor = mcdu.flightPlanManager.getCurrentFlightPlanIndex() === 1 ? "yellow" : "green";
            }
            const rows = [[""], [""], [""], [""], [""], [""]];
            for (let i = 0; i < 3; i++) {
                const index = i + pageCurrent;
                if (selectedApproach) {
                    const approachTransition = selectedApproach.transitions[index];
                    if (approachTransition) {
                        let color = "cyan";
                        if (index === mcdu.flightPlanManager.getApproachTransitionIndex()) {
                            color = "green";
                        }
                        rows[2 * i + 1][0] = "{" + approachTransition.name + "[color]" + color;
                        mcdu.onLeftInput[i + 2] = () => {
                            mcdu.setApproachTransitionIndex(index, () => {
                                CDUAvailableArrivalsPage.ShowPage(mcdu, airport, 0, true);
                            });
                        };
                    }
                }
            }
            let bottomLine = ["<RETURN"];
            if (mcdu.flightPlanManager.getCurrentFlightPlanIndex() === 1) {
                bottomLine = ["{ERASE[color]amber", "INSERT*[color]amber"];
                mcdu.onLeftInput[5] = async () => {
                    mcdu.eraseTemporaryFlightPlan(() => {
                        CDUFlightPlanPage.ShowPage(mcdu);
                    });
                };
                mcdu.onRightInput[5] = async () => {
                    mcdu.insertTemporaryFlightPlan(() => {
                        mcdu.updateTowerHeadwind();
                        mcdu.updateConstraints();
                        CDUPerformancePage.UpdateThrRedAccFromDestination(mcdu);
                        CDUAvailableArrivalsPage.ShowPage(mcdu, airport, 0, true);
                    });
                };
            } else {
                mcdu.onLeftInput[5] = () => {
                    CDUAvailableArrivalsPage.ShowPage(mcdu, airport, 0, true);
                };
            }
            mcdu.setTemplate([
                ["APPROACH VIAS"],
                ["{sp}APPR", "STAR{sp}", "{sp}VIA"],
                [selectedApproachCell + "[color]" + selectedApproachCellColor , selectedStarCell + "[color]" + selectedStarCellColor, "{sp}" + selectedViasCell + "[color]" + selectedViasCellColor],
                ["APPR VIAS"],
                ["{NO VIAS[color]cyan"],
                rows[0],
                rows[1],
                rows[2],
                rows[3],
                rows[4],
                rows[5],
                rows[6],
                bottomLine
            ]);
            mcdu.onLeftInput[1] = () => {
                mcdu.setApproachTransitionIndex(-1, () => {
                    CDUAvailableArrivalsPage.ShowPage(mcdu, airport, 0, true);
                });
            };
            let up = false;
            let down = false;

            if (pageCurrent < selectedApproach.transitions.length - 3) {
                mcdu.onUp = () => {
                    pageCurrent++;
                    if (pageCurrent < 0) {
                        pageCurrent = 0;
                    }
                    CDUAvailableArrivalsPage.ShowViasPage(mcdu, airport, pageCurrent);
                };
                up = true;
            }
            if (pageCurrent > 0) {
                mcdu.onDown = () => {
                    pageCurrent--;
                    if (pageCurrent < 0) {
                        pageCurrent = 0;
                    }
                    CDUAvailableArrivalsPage.ShowViasPage(mcdu, airport, pageCurrent);
                };
                down = true;
            }
            mcdu.setArrows(up, down, true, true);
        }
    }
}
