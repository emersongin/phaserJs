import { CardData } from "../Cardset/CardData";
import { CardState, StaticState, MovingState, UpdatingState } from "./CardState";
import { Move } from "./Move";

export class Card extends Phaser.GameObjects.Container {
    background: Phaser.GameObjects.Rectangle;
    image: Phaser.GameObjects.Image;
    display: Phaser.GameObjects.Text;
    status: CardState;
    faceUp: boolean = false;
    closed: boolean = false;
    disabled: boolean = false;
    cardData: CardData;

    private constructor(
        readonly scene: Phaser.Scene, 
        x: number, 
        y: number, 
        cardData: CardData,
    ) {
        super(scene, x, y);
        this.width = 100;
        this.height = 150;
        this.cardData = cardData;
        this.setData('hp', cardData.hp);
        this.setData('ap', cardData.ap);
        this.createBackground();
        this.createImage();
        this.createDisplay();
        this.changeState(new StaticState(this));
        this.scene.add.existing(this);
    }

    private createBackground(): void {
        const backgroundColor = this.getBgColor();
        const backgroundRect = this.scene.add.rectangle(0, 0, this.width, this.height, backgroundColor);
        backgroundRect.setOrigin(0, 0);
        this.background = backgroundRect;
        this.add(backgroundRect);
    }

    private getBgColor(): number {
        switch (this.cardData.color) {
            case 'red':
                return 0xff0000; // Red
            case 'blue':
                return 0x0000ff; // Blue
            case 'green':
                return 0x00ff00; // Green
            case 'white':
                return 0xffffff; // White
            case 'black':
                return 0x000000; // Black
            case 'orange':
                return 0xffa500; // Orange
            default:
                throw new Error(`Unknown color: ${this.cardData.color}`);
        }
    }

    private createImage(): void {
        const image = this.scene.add.image(0, 0, 'empty');
        this.image = image;
        this.setBack();
        this.add(this.image);
    }

    private setImage() {
        this.image.setTexture(this.cardData.imageName);
        this.image.setOrigin(0, 0);
        const larguraDesejada = 100 - 12;
        const alturaDesejada = 150 - 12;
        const escalaX = larguraDesejada / this.image.width;
        const escalaY = alturaDesejada / this.image.height;
        const escalaProporcional = Math.min(escalaX, escalaY);
        this.image.setScale(escalaProporcional);
        this.image.setPosition((this.width - this.image.displayWidth) / 2, (this.height - this.image.displayHeight) / 2);
    }

    private setBack() {
        this.image.setTexture('card-back');
        this.image.setOrigin(0, 0);
        const larguraDesejada = 100 - 12;
        const alturaDesejada = 150 - 12;
        const escalaX = larguraDesejada / this.image.width;
        const escalaY = alturaDesejada / this.image.height;
        const escalaProporcional = Math.min(escalaX, escalaY);
        this.image.setScale(escalaProporcional);
        this.image.setPosition((this.width - this.image.displayWidth) / 2, (this.height - this.image.displayHeight) / 2);
    }

    private createDisplay(): void {
        let display: Phaser.GameObjects.Text;
        const { typeId: cardTypeId } = this.cardData;
        if (cardTypeId === 'battle') {
            const { ap, hp } = this.getAllData('ap', 'hp');
            const apText = ap.toString().padStart(2, "0"); 
            const hpText = hp.toString().padStart(2, "0");
            display = this.scene.add.text(this.width - 80, this.height - 32, `${apText}/${hpText}`, {
                fontSize: '24px',
                color: '#ffffff',
                fontStyle: 'bold',
            });
        } else if (cardTypeId === 'power') {
            display = this.scene.add.text(this.width - 28, this.height - 32, 'P', {
                fontSize: '24px',
                color: '#ffffff',
                fontStyle: 'bold',
            });
        } else {
            throw new Error(`Unknown card type id: ${cardTypeId}`);
        }
        display.setOrigin(0, 0);
        this.display = display;
        this.add(display);
    }

    getAllData(...keys: string[]): any {
        const result: any = {};
        keys.forEach(key => {
            const data = this.getData(key);
            if (data !== undefined) {
                result[key] = data;
            } else {
                throw new Error(`Key "${key}" not found in card data.`);
            }
        });
        return result;
    }

    static create(
        scene: Phaser.Scene, 
        cardData: CardData
    ): Card {
        return new Card(scene, 0, 0, cardData);
    }

    changeState(state: CardState, ...args: any[]): void {
        this.status = state;
        this.status.create(...args);
    }

    preUpdate() {
        if (!this.status) return;
        this.status.update();
    }

    movePosition(x: number, y: number): void {
        if (!this.status) return;
        const moves: Move[] = [{ x, y }];
        this.move(moves, 0);
    }

    private move(moves: Move[], duration: number): void {
        if (!this.status) return;        
        if (this.status instanceof MovingState) {
            this.status.addTweens(moves, duration);
            return;
        }
        this.changeState(new MovingState(this), moves, duration);
    }

    moveFromTo(xFrom: number, yFrom: number, xTo: number, yTo: number, duration: number): void {
        if (!this.status) return;
        const moves: Move[] = [
            { x: xFrom, y: yFrom, duration: 0 }, 
            { x: xTo, y: yTo, duration }
        ];
        this.move(moves, duration);
    }

    open(onOpened?: () => void | null): void {
        if (this.closed) return;
        const moves: Move[] = [
            {
                x: this.x,
                scaleX: 1,
                ease: 'Linear',
                onComplete: () => {
                    this.closed = false;
                    if (onOpened) onOpened();
                }, 
            }
        ];
        this.move(moves, 200);
    }

    close(onClosed?: () => void | null): void {
        if (this.closed) return;
        const moves: Move[] = [
            {
                x: this.x + (this.width / 2),
                scaleX: 0,
                ease: 'Linear',
                onComplete: () => {
                    this.closed = true;
                    if (onClosed) onClosed();
                }, 
            },
        ];
        this.move(moves, 200);
    }

    flip(): void {
        if (this.closed) return;
        this.close(() => {
            this.toogleImage();
        });
        this.open();
    }

    toogleImage(): void {
        if (this.faceUp) {
            this.setBack();
            this.faceUp = false;
        } else {
            this.setImage();
            this.faceUp = true;
        }
    }

    changeApDisplay(ap: number): void {
        if (!this.status) return;   
        this.changeState(new UpdatingState(this), ap, this.getData('hp'));
    }

}