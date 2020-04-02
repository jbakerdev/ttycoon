import { Scene, GameObjects, Tilemaps, Geom } from "phaser";
import { store } from "../../App";
import { defaults, SpriteIndexes, Buildings } from '../../assets/Assets'
import { Modal, UIReducerActions, StaticLayers, Activities, StationOffsets, RandomEvents, Chatter } from "../../enum";
import * as v4 from 'uuid'
import { onUpdatePlots, onShowBuy, onShowSell, onTransactionComplete, onShowModal, onPlaceBuilding } from "../uiManager/Thunks";
import { findValue } from "../Util";
import BuildingSprite from "./BuildingSprite";


export default class ParkScene extends Scene {

    unsubscribeRedux: Function
    selectIcon: GameObjects.Image
    selectedPlot: GameObjects.TileSprite
    sounds: any
    plotSprites: Array<GameObjects.TileSprite>
    buildingSprites: Array<BuildingSprite>
    placingBuilding: BuildingSprite
    map:Tilemaps.Tilemap
    baseLayer: Tilemaps.StaticTilemapLayer
    focusedItem: GameObjects.Sprite
    avatar:GameObjects.Sprite

    constructor(config){
        super(config)
        this.unsubscribeRedux = store.subscribe(this.onReduxUpdate)
        this.plotSprites = []
        this.buildingSprites = []
    }

    preload = () =>
    {
        defaults.forEach(asset=>{
            (this.load[asset.type] as any)(asset.key, asset.resource, asset.data)
        })
        console.log('assets were loaded.')
    }
    
    onReduxUpdate = () => {
        const uiState = store.getState()
        let engineEvent = uiState.engineEvent
        if(engineEvent)
            switch(engineEvent){
                case UIReducerActions.MUTE:
                    if(this.sound.volume > 0) this.sound.volume = 0
                    else this.sound.volume = 0.1
                    break
                case UIReducerActions.SELL:
                    //Run selling animation
                    this.buildingSprites = this.buildingSprites.filter(bs=>{
                        if(bs.id === uiState.sellingBuilding.id){
                            bs.destroy()
                            return false
                        } 
                        return true
                    })
                    onTransactionComplete()
                    break
                case UIReducerActions.BUY: 
                    //Run buy animation
                    this.buildingSprites.push(this.placingBuilding)
                    this.placingBuilding = null
                    onTransactionComplete()
                    break
                case UIReducerActions.PLACE_BUILDING:
                    this.placingBuilding = new BuildingSprite(this, this.map.widthInPixels/2, this.map.heightInPixels/2, uiState.placingBuilding.type, uiState.placingBuilding).setAlpha(0.3)
                    break
            }
    }

    create = () =>
    {
        this.sound.volume = 0.1
        this.sounds = {
            step: this.sound.add('step'),
            dead: this.sound.add('dead'),
            error: this.sound.add('error')
        }

        this.map = this.make.tilemap({ key: 'map'})
        let tileset = this.map.addTilesetImage('tiles', 'tiles')
        let city_tiles = this.map.addTilesetImage('galletcity_tiles', 'gallet_city')
        this.baseLayer = this.map.createStaticLayer('base', [tileset, city_tiles])
        let paths = this.map.createStaticLayer('paths', tileset)
        let zones = this.map.createFromObjects('buildable_zone', 'buildable', {})
        let plots = []
        this.plotSprites = zones.map(s=>{
            let zone = this.add.tileSprite(s.x, s.y+s.displayHeight, s.displayWidth, s.displayHeight, 'tiles_sprites', SpriteIndexes.plot).setInteractive()
            let plot = {
                id: v4(),
                building: null,
                x: zone.x,
                y: zone.y,
                width: zone.displayWidth,
                height: zone.displayHeight,
                size: +findValue(s.data,'size')
            }
            plots.push(plot)
            zone.name = plot.id
            s.destroy()
            return zone
        })

        this.time.addEvent({
            delay: 1000,
            callback: this.tick,
            repeat: -1
        })

        this.cameras.main.setZoom(2)
        this.cameras.main.centerOn(this.map.widthInPixels/2, this.map.heightInPixels/2)
        
        this.input.on('pointerover', (event, gameObjects) => {
            if(!store.getState().modal){
                this.setSelectedPlot(gameObjects[0])
            }
        })
        this.input.on('pointermove', (event, gameObjects) => {
            if(this.placingBuilding){
                this.placingBuilding.setPosition(this.input.activePointer.worldX, this.input.activePointer.worldY)
                let valid = this.checkBuildingIntersection(this.placingBuilding)
                if(valid) this.placingBuilding.setTint(0x00ff00)
                else this.placingBuilding.setTint(0xff0000)
            }
        })
        this.input.on('pointerdown', (event, gameObjects) => {
            if(!store.getState().modal){
                if(this.placingBuilding && this.placingBuilding.tintTopLeft === 0x00ff00){
                    this.placingBuilding.clearTint()
                    this.placingBuilding.clearAlpha()
                    onPlaceBuilding()
                    return
                }
                if(gameObjects[0].name){
                    onShowModal(Modal.BUY)
                    return
                }
                else if(gameObjects[0].id && !this.placingBuilding){
                    let building = store.getState().buildings.find(b=>b.id === gameObjects[0].id)
                    onShowSell(building)
                    return
                }
            }
        })
        this.input.keyboard.on('keydown-SHIFT', (event) => {
            if(this.placingBuilding){
                this.placingBuilding.setAngle(this.placingBuilding.angle === 0 ? 90 : 0)
            }
        })
        
        this.input.mouse.disableContextMenu()
    }

    setSelectedPlot = (sprite:GameObjects.TileSprite) => {
        this.setSelectIconPosition(sprite.getCenter())
        // let stationOffset = StationOffsets[station.name]
        // if(!this.avatar) this.avatar = this.add.sprite(station.getCenter().x+stationOffset.x, station.getCenter().y+stationOffset.y, 'avatar', Sprites['avatar'+station.name])
        // else{
        //     this.avatar.setFrame(Sprites['avatar'+station.name])
        //     this.avatar.setPosition(station.getCenter().x+stationOffset.x, station.getCenter().y+stationOffset.y)
        // } 
    }

    checkBuildingIntersection = (building:BuildingSprite) => {
        let brect = new Geom.Rectangle(building.getTopLeft().x, building.getTopLeft().y, building.displayWidth, building.displayHeight)
        if(building.angle === 90) {
            brect = new Geom.Rectangle(building.getBottomLeft().x, building.getBottomLeft().y, building.displayHeight, building.displayWidth)
        }
        return this.plotSprites.find(p=>
            Phaser.Geom.Rectangle.ContainsRect(
                new Geom.Rectangle(p.getTopLeft().x,p.getTopLeft().y,p.displayWidth, p.displayHeight), brect)
        )
    }

    shakeIt = (station:GameObjects.Sprite) => {
        this.sounds.error.play()
        this.tweens.add({
            targets: station,
            x: {
                from: station.x+Phaser.Math.Between(-2,2),
                to: station.x
            },
            y: {
                from: station.y+Phaser.Math.Between(-2,2),
                to: station.y
            },
            repeat:2,
            duration: 40
        })
        this.showText(this.avatar.getBottomCenter().x, this.avatar.getBottomCenter().y+30, 'hey')
    }

    setSanity = (val:number) => {
        // val = Math.min(MAX_SANITY_PIXELS, val)
        // if(val > this.sanity){
        //     this.tweens.add({
        //         targets: this.bar,
        //         tilePositionX: this.bar.tilePositionX-5,
        //         duration: 500
        //     })
        // }
        // let diff = this.sanity - val
        // this.bar.width = Math.max(1,val)
        // this.bar.setPosition(this.bar.x-(diff/2), this.bar.y)
        // this.sanity = val
    }

    tick = () => {
        
    }

    setSelectIconPosition(tuple:Tuple){
        if(!this.selectIcon){
            this.selectIcon = this.add.image(tuple.x, tuple.y, 'selected').setDepth(2).setScale(0.5)
            this.add.tween({
                targets: this.selectIcon,
                scale: 1,
                duration: 1000,
                repeat: -1,
                ease: 'Stepped',
                easeParams: [3],
                yoyo: true
            })
        }
        this.selectIcon.setPosition(tuple.x,tuple.y)
        this.sounds.step.play()
    }

    showText = (x:number, y:number, text:string, duration?:number) => {
        let font = this.add.text(x-30, y, text, {
            fontFamily: 'Arcology', 
            fontSize: '8px',
            color: 'white'
        })
        font.setStroke('#000000', 2);
        font.setWordWrapWidth(120)
        font.setDepth(4)
        this.add.tween({
            targets: font,
            ease: 'Stepped',
            easeParams:[4],
            duration: duration ? duration*1000 : 1500,
            y: y,
            onComplete: ()=>{
                font.destroy()
            }
        })
    }

    update(time:number, delta:number){
        
    }
}