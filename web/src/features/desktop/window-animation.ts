export interface LaunchSourceRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

export interface WindowLaunchAnimation {
	sourceRect: LaunchSourceRect;
	token: number;
}
