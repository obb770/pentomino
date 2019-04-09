// This JavaScript source code is placed in the public domain
(function () {
'use strict';

var sort, coordCompare, normalize, uniquify, pieceKey, numCompare,
    linearize, minoKey, grow, group, getMinos, solve, SIZE = 5, run;

sort = function (array, cmp) {
    cmp = cmp || function (a, b) {return a.localeCompare(b);};
    array.map(function (val, index) {
        return [val, index];
    }).sort(function (a, b) {
        return cmp(a[0], b[0]) || a[1] - b[1];
    }).map(function (val) {
        return val[0];
    }).forEach(function (val, index) {
        array[index] = val;
    });
    return array;
};

coordCompare = function (a, b) {
    var result = a.x - b.x;
    if (result === 0) {
        result = a.y - b.y;
    }
    return result;
};

normalize = function (mino) {
    var base;
    base = mino.reduce(function (prev, curr) {
        var base = {};
        base.x = prev.x;
        if (curr.x < prev.x) {
            base.x = curr.x;
        }
        base.y = prev.y;
        if (curr.y < prev.y) {
            base.y = curr.y;
        }
        return base;
    });
    return sort(mino.map(function (val) {
        return {'x': val.x - base.x, 'y': val.y - base.y};
    }), coordCompare);
};

uniquify = function (list, keyFunc) {
    var dict = {};
    list.forEach(function (obj) {
        dict[keyFunc(obj)] = obj;
    });
    return Object.keys(dict).map(function (key) {
        return dict[key];
    });
};

pieceKey = function (piece) {
    return JSON.stringify([piece.x, piece.y]);
};

numCompare = function (a, b) {
    return a - b;
};

linearize = function (mino, width) {
    return sort(mino.map(function (piece) {
        return piece.x * width + piece.y;
    }), numCompare).map(function (piece, index, array) {
        void index;
        return piece - array[0];
    });
};

minoKey = function (mino) {
    return JSON.stringify(linearize(mino, mino.length));
};

grow = function (mino) {
    var grown = [];
    mino.forEach(function (piece) {
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (delta) {
            var bigger = mino.slice();
            bigger.push({'x': piece.x + delta[0], 'y': piece.y + delta[1]});
            if (uniquify(bigger, pieceKey).length > mino.length) {
                grown.push(normalize(bigger));
            }
        });
    });
    return uniquify(grown, minoKey);
};

group = function (minos) {
    var transpose, reflectx, reflecty, reflectxy, transform, groups;
    transpose = function (p) { return {'x': p.y, 'y': p.x}; };
    reflectx = function (p) { return {'x': p.x, 'y': -p.y}; };
    reflecty = function (p) { return {'x': -p.x, 'y': p.y}; };
    reflectxy = function (p) { return {'x': -p.x, 'y': -p.y}; };
    transform = function (mino, t) { return normalize(mino.map(t)); };
    groups = minos.map(function (mino) {
        var g = [mino, transform(mino, transpose)];
        [reflectx, reflecty, reflectxy].forEach(function (t) {
            g.push(transform(g[0], t), transform(g[1], t));
        });
        return uniquify(g, minoKey);
    });
    return uniquify(groups, function (g) {
        return sort(g.map(minoKey))[0];
    });
};

getMinos = function (size, width) {
    var minos, extend;
    extend = function (grown, mino) {
        return grown.concat(grow(mino));
    };
    minos = [[{'x': 0, 'y': 0}]];
    while (minos[0].length < size) {
        minos = uniquify(minos.reduce(extend, []), minoKey);
    }
    minos = group(minos);

    sort(minos, function (a, b) {return b.length - a.length;});
    minos[0] = [minos[0][0]];  // should be a group of 8
    minos[0].push(normalize(minos[0][0].map(function (p) {
        return {'x': p.y, 'y': p.x};
    })));
    minos = minos.map(function (g) {
        return g.map(function (mino) {return linearize(mino, width);});
    });
    return minos;
};

solve = function (size, width, callback) {
    var minos, height, board, i, j, EMPTY, BLOCKED, perm, count, start, iter;
    minos = getMinos(size, width + 1);
    height = size * minos.length / width;
    EMPTY = -1;
    BLOCKED = minos.length;
    board = [];
    for (i = 0; i < height + size; i++) {
        for (j = 0; j < width + 1; j++) {
            board[i * (width + 1) + j] =
                i >= height || j >= width ? BLOCKED : EMPTY;
        }
    }
    perm = [];
    for (i = 0; i < minos.length; i++) {
        perm[i] = i;
    }
    count = 0;
    start = Date.now();
    iter = function (dep, pos) {
        var n, m, i, o, p;
        while (pos < height * (width + 1) && board[pos] !== EMPTY) {
            pos++;
        }
        for (n = dep; n < minos.length; n++) {
            m = perm[n];
            perm[n] = perm[dep];
            perm[dep] = m;
            for (i = 0; i < minos[m].length; i++) {
                o = minos[m][i];
                for (p = 0; p < o.length; p++) {
                    if (board[pos + o[p]] !== EMPTY) {
                        break;
                    }
                }
                if (p < o.length) {
                    continue;
                }
                for (p = 0; p < o.length; p++) {
                    board[pos + o[p]] = m;
                }
                if (dep + 1 < minos.length) {
                    iter(dep + 1, pos + 1);
                }
                else {
                    count++;
                    callback(count, Date.now() - start, board, height);
                }
                for (p = 0; p < o.length; p++) {
                    board[pos + o[p]] = EMPTY;
                }
            }
            m = perm[n];
            perm[n] = perm[dep];
            perm[dep] = m;
        }
    };
    iter(0, 0);
};

run = function (width, callback) {
    solve(SIZE, width, function (count, time, board, height) {
        var i, j, line, lines, index, SYMBOL = '0123456789AB=';
        lines = [];
        for (j = 0; j < width; j++) {
            line = '';
            for (i = 0; i < height; i++) {
                index = board[i * (width + 1) + j];
                line += index >= 0 ? SYMBOL[index] : '*';
            }
            lines.push(line);
        }
        callback(count, time, lines);
    });
};

if (typeof self !== 'undefined') {
    (function () {
        // jshint worker:true
        self.onmessage = function (e) {
            run(e.data, function (count, time, lines) {
                postMessage({'count': count, 'time': time, 'lines': lines});
            });
        };
    }());
}
else if (typeof exports !== 'undefined') {
    (function () {
        // jshint node:true
        exports.run = run;
        if (require.main === module) {
            run(parseInt(process.argv[2] || '3'),
                    function (count, time, lines) {
                console.log(count, time);
                console.log(lines.join('\n'));
            });
        }
    }());
}

}());
