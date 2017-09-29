// @flow

const parseColor = require('../style-spec/util/parse_color');
const createExpression = require('../style-spec/expression');
const {isExpression} = require('../style-spec/expression');
const convertFunction = require('../style-spec/function/convert');
const util = require('../util/util');
const Curve = require('../style-spec/expression/definitions/curve');

import type {StyleExpression, Feature} from '../style-spec/expression';

function normalizeToExpression(parameters, propertySpec): StyleExpression {
    if (typeof parameters === 'string' && propertySpec.type === 'color') {
        const color = parseColor(parameters);
        return {
            isFeatureConstant: true,
            isZoomConstant: true,
            evaluate() { return color; }
        };
    }

    if (parameters === null || typeof parameters !== 'object' || Array.isArray(parameters)) {
        return {
            isFeatureConstant: true,
            isZoomConstant: true,
            evaluate() { return parameters; }
        };
    }

    if (parameters.expression) {
        return createExpression(parameters.expression, propertySpec);
    } else {
        return createExpression(convertFunction(parameters, propertySpec), propertySpec, {
            defaultValue: parameters.default,
            isConvertedFunction: true
        });
    }
}

/**
 * A style property declaration
 * @private
 */
class StyleDeclaration {
    value: any;
    isExpression: boolean;
    json: mixed;
    minimum: number;
    expression: StyleExpression;

    constructor(reference: any, value: any) {
        this.value = util.clone(value);
        this.isExpression = isExpression(value);

        // immutable representation of value. used for comparison
        this.json = JSON.stringify(this.value);

        this.minimum = reference.minimum;
        this.expression = normalizeToExpression(this.value, reference);
    }

    calculate(globalProperties: {+zoom?: number} = {}, feature?: Feature) {
        const value = this.expression.evaluate(globalProperties, feature);
        if (this.minimum !== undefined && value < this.minimum) {
            return this.minimum;
        }
        return value;
    }

    /**
     * Calculate the interpolation factor for the given zoom stops and current
     * zoom level.
     */
    interpolationFactor(zoom: number, lower: number, upper: number) {
        if (this.expression.isZoomConstant) {
            return 0;
        } else {
            return Curve.interpolationFactor(
                this.expression.zoomCurve.interpolation,
                zoom,
                lower,
                upper
            );
        }
    }
}

module.exports = StyleDeclaration;
