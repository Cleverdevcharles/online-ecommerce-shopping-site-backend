const formidable = require('formidable');
const _ = require('lodash');
const fs = require('fs');
const Site = require('../models/site');
const { errorHandler } = require('../helpers/dbErrorHandler');

exports.siteById = (req, res, next, id) => {
    Site.findById(id)
        .exec((err, site) => {
            if (err || !site) {
                return res.status(400).json({
                    error: 'Site not found'
                });
            }
            req.site = site;
            next();
        });
};

exports.read = (req, res) => {
    req.site.logo = undefined;
    return res.json(req.site);
};

exports.create = (req, res) => {
    let form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(400).json({
                error: 'Logo could not be uploaded'
            });
        }
        // check for all fields
        const { name, about, email, facebook_url, whatsapp_url, twitter_url, instagram_url, phone} = fields;

       

        if (!name || !phone || !email || !about ) {
            return res.status(400).json({
                error: 'All fields are required'
            });
        }

        let site = new Site(fields);

        // 1kb = 1000
        // 1mb = 1000000

        if (files.logo) {
            if (files.logo.size > 1000000) {
                return res.status(400).json({
                    error: 'Image should be less than 1mb in size'
                });
            }
            site.logo.data = fs.readFileSync(files.logo.path);
            site.logo.contentType = files.logo.type;
        }

        site.save((err, result) => {
            if (err) {
                console.log('Site CREATE ERROR ', err);
                return res.status(400).json({
                    error: errorHandler(err)
                });
            }
            res.json(result);
        });
    });
};

exports.remove = (req, res) => {
    let site = req.site;
    site.remove((err, deletedSite) => {
        if (err) {
            return res.status(400).json({
                error: errorHandler(err)
            });
        }
        res.json({
            message: 'Site deleted successfully'
        });
    });
};

exports.update = (req, res) => {
    let form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(400).json({
                error: 'Image could not be uploaded'
            });
        }

        let site = req.site;
        site = _.extend(site, fields);

        // 1kb = 1000
        // 1mb = 1000000

        if (files.logo) {
            // console.log("FILES logo: ", files.logo);
            if (files.logo.size > 1000000) {
                return res.status(400).json({
                    error: 'Image should be less than 1mb in size'
                });
            }
            site.logo.data = fs.readFileSync(files.logo.path);
            site.logo.contentType = files.logo.type;
        }

        site.save((err, result) => {
            if (err) {
                return res.status(400).json({
                    error: errorHandler(err)
                });
            }
            res.json(result);
        });
    });
};

/**
 * arrival
 * by arrival = /sites?sortBy=createdAt&order=desc&limit=4
 * if no params are sent, then all sites are returned
 */

exports.list = (req, res) => {
    let order = req.query.order ? req.query.order : 'asc';
    let sortBy = req.query.sortBy ? req.query.sortBy : '_id';
    let limit = req.query.limit ? parseInt(req.query.limit) : 1;

    Site.find()
        .select('-logo')
        .sort([[sortBy, order]])
        .limit(limit)
        .exec((err, sites) => {
            if (err) {
                return res.status(400).json({
                    error: 'Sites not found'
                });
            }
            res.json(sites);
        });
};

/**
 * arrival
 * by arrival = /sites?sortBy=createdAt&order=desc&limit=4
 * if no params are sent, then all sites are returned
 */

exports.list = (req, res) => {
    let order = req.query.order ? req.query.order : 'asc';
    let sortBy = req.query.sortBy ? req.query.sortBy : '_id';
    let limit = req.query.limit ? parseInt(req.query.limit) : 1;

    Site.find()
        .select('-logo')
        .sort([[sortBy, order]])
        .limit(limit)
        .exec((err, sites) => {
            if (err) {
                return res.status(400).json({
                    error: 'Sites not found'
                });
            }
            res.json(sites);
        });
};


exports.logo = (req, res, next) => {
    if (req.site.logo.data) {
        res.set('Content-Type', req.site.logo.contentType);
        return res.send(req.site.logo.data);
    }
    next();
};




