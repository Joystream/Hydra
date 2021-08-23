"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumericField = void 0;
var utils_1 = require("../utils");
var GraphQLBigNumber_1 = require("../tgql/GraphQLBigNumber");
var getCombinedDecorator_1 = require("./getCombinedDecorator");
function NumericField(options) {
    var _a;
    if (options === void 0) { options = {}; }
    var dataType = options.dataType, filter = options.filter, sort = options.sort, dbOptions = __rest(options, ["dataType", "filter", "sort"]);
    var nullableOption = options.nullable === true ? { nullable: true } : {};
    var factories = getCombinedDecorator_1.getCombinedDecorator({
        fieldType: 'numeric',
        warthogColumnMeta: options,
        gqlFieldType: GraphQLBigNumber_1.GraphQLBigNumber,
        dbType: (_a = options.dataType) !== null && _a !== void 0 ? _a : 'numeric',
        dbColumnOptions: __assign(__assign({}, nullableOption), dbOptions)
    });
    return utils_1.composeMethodDecorators.apply(void 0, factories);
}
exports.NumericField = NumericField;
//# sourceMappingURL=NumericField.js.map