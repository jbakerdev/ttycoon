import * as React from 'react'
import AppStyles from '../../AppStyles';
import Viewscreen from './Viewscreen'
import { TopBar, Button, LightButton, RangeInput, Icon, ProgressBar, NumericInput } from '../Shared'
import { Modal, StatusDescription } from '../../enum';
import Lose from '../views/Lose';
import Win from '../views/Win';
import {onMuteAudio, onSummonAnimalTruck, onSetAdmission, onShowModal } from '../uiManager/Thunks'
import Buy from '../views/Buy';
import Sell from '../views/Sell';
import Animals from '../views/Animals'
import { Icons, Sprites } from '../../assets/Assets';
import Meat from '../views/Meat';
import Advertising from '../views/Advertising';
import Hiring from '../views/Hiring';
import { store } from '../../App';

export default class ViewscreenFrame extends React.Component {

    render(){
        let state = store.getState()
        return (
                <div style={{position:'relative', padding:'17px'}}>
                    <Viewscreen />
                    {state.modal === Modal.LOSE && <Lose/>}
                    {state.modal === Modal.WIN && <Win/>}
                    {state.modal === Modal.BUY && <Buy/>}
                    {state.modal === Modal.SELL && <Sell/>}
                    {state.modal === Modal.ANIMALS && <Animals/>}
                    {state.modal === Modal.MEAT && <Meat/>}
                    {state.modal === Modal.ADS && <Advertising/>}
                    {state.modal === Modal.PRISON && <Hiring/>}
                    <div style={{position:'absolute', top:10,left:10}}>
                        {Object.keys(state.status).map(key=><div style={{marginRight:'10px'}}>{Icon(key, StatusDescription[key])}</div>)}
                    </div>
                    <div style={{position:'absolute', bottom:10,left:10}}>
                        <h6>Day {state.day}</h6>
                        <h6>Admission {Icon('CASH', '')}{NumericInput(state.admission, (val)=>onSetAdmission(val), 1000000, 0)}</h6>
                        <h6>Cash {Icon('CASH', '')}{state.cash}</h6>
                        <h6>Meat {Icon('MEAT', '')}{state.meat}</h6>
                        <h6>PETA Threats: {getPetaText(state.peta)}</h6>
                        <h6>Staff: {state.employees} / {state.buildings.length}</h6>
                        <h6 style={{cursor:'pointer'}} onClick={onMuteAudio}>Mute</h6>
                        <div style={{display:'flex'}}>
                            <div onClick={onSummonAnimalTruck}>{Icon(Icons.animal_dealer, "Bob's Exotics (Animals)", true)}</div>
                            <div onClick={()=>onShowModal(Modal.PRISON)}>{Icon(Icons.warden, "Warden James (Hiring)", true)}</div>
                            <div onClick={()=>onShowModal(Modal.ADS)}>{Icon(Icons.ad_man, "Jimmy Goodman (Advertising)", true)}</div>
                        </div>
                    </div>
                </div>
        )
    }
}

const getPetaText = (val:number) => {
    if(val > 40) return 'Extreme'
    if(val > 30) return 'Very High'
    if(val > 20) return 'High'
    if(val > 10) return 'Moderate'
    return 'Low'

}