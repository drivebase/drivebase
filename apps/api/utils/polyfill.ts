// Polyfill browser APIs needed by pdfjs-dist on arm64-musl builds
// where @napi-rs/canvas native module fails to load (e.g. OrangePi / RPi Cortex-A53).
// This file must be imported before any pdfjs-dist usage.

if (typeof globalThis.DOMMatrix === "undefined") {
	// @ts-ignore
	globalThis.DOMMatrix = class DOMMatrix {
		a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
		m11 = 1; m12 = 0; m13 = 0; m14 = 0;
		m21 = 0; m22 = 1; m23 = 0; m24 = 0;
		m31 = 0; m32 = 0; m33 = 1; m34 = 0;
		m41 = 0; m42 = 0; m43 = 0; m44 = 1;
		is2D = true; isIdentity = true;

		constructor(init?: number[] | string) {
			if (Array.isArray(init) && init.length === 6) {
				[this.a, this.b, this.c, this.d, this.e, this.f] = init;
				this.m11 = init[0]; this.m12 = init[1];
				this.m21 = init[2]; this.m22 = init[3];
				this.m41 = init[4]; this.m42 = init[5];
			}
		}

		static fromMatrix() { return new DOMMatrix(); }
		multiply() { return new DOMMatrix(); }
		scale() { return new DOMMatrix(); }
		translate() { return new DOMMatrix(); }
		rotate() { return new DOMMatrix(); }
		rotateAxisAngle() { return new DOMMatrix(); }
		skewX() { return new DOMMatrix(); }
		skewY() { return new DOMMatrix(); }
		inverse() { return new DOMMatrix(); }
		flipX() { return new DOMMatrix(); }
		flipY() { return new DOMMatrix(); }
		transformPoint(p: unknown) { return p; }
		toString() { return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`; }
	};
}

if (typeof globalThis.DOMPoint === "undefined") {
	// @ts-ignore
	globalThis.DOMPoint = class DOMPoint {
		constructor(
			public x = 0,
			public y = 0,
			public z = 0,
			public w = 1,
		) {}
		static fromPoint(p: { x?: number; y?: number; z?: number; w?: number }) {
			return new DOMPoint(p.x, p.y, p.z, p.w);
		}
		matrixTransform() { return new DOMPoint(); }
	};
	// @ts-ignore
	globalThis.DOMPointReadOnly = globalThis.DOMPoint;
}

if (typeof globalThis.ImageData === "undefined") {
	// @ts-ignore
	globalThis.ImageData = class ImageData {
		data: Uint8ClampedArray;
		width: number;
		height: number;
		colorSpace = "srgb";

		constructor(widthOrData: number | Uint8ClampedArray, height: number) {
			if (widthOrData instanceof Uint8ClampedArray) {
				this.data = widthOrData;
				this.width = height;
				this.height = widthOrData.length / (4 * height);
			} else {
				this.width = widthOrData;
				this.height = height;
				this.data = new Uint8ClampedArray(widthOrData * height * 4);
			}
		}
	};
}

if (typeof globalThis.Path2D === "undefined") {
	// @ts-ignore
	globalThis.Path2D = class Path2D {
		constructor(_path?: unknown) {}
		addPath() {}
		closePath() {}
		moveTo() {}
		lineTo() {}
		bezierCurveTo() {}
		quadraticCurveTo() {}
		arc() {}
		arcTo() {}
		ellipse() {}
		rect() {}
		roundRect() {}
	};
}
