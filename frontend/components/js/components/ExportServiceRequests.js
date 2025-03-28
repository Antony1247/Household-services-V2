export default {
    template: `
        <div>
            <nav class="navbar navbar-dark bg-dark">
                <div class="container-fluid">
                    <a class="navbar-brand" href="/#/admin-dashboard">Admin Dashboard</a>
                    <div>
                        <router-link to="/servicesList" class="nav-link d-inline text-white">Manage Services</router-link>
                        <router-link to="/professionalsList" class="nav-link d-inline text-white">Manage Professionals</router-link>
                        <router-link to="/customers" class="nav-link d-inline text-white">Manage Customers</router-link>
                        <router-link to="/service-requests" class="nav-link d-inline text-white">service requests</router-link>
                        <router-link to="/export-service-requests" class="nav-link d-inline text-white">Export CSV</router-link>
                        <router-link to="/admin-search" class="nav-link d-inline text-white">Search</router-link>
                        <button @click="logout" class="btn btn-danger ms-3">Logout</button>
                    </div>
                </div>
            </nav>
        <div class="container mt-5">
            <h1 class="text-center">Export Service Requests</h1>
            
            <div class="mb-3">
                <label for="professionalId" class="form-label">Enter Professional ID:</label>
                <input v-model="professionalId" type="text" id="professionalId" class="form-control" placeholder="Enter Professional ID">
            </div>

            <button @click="fetchRequests" class="btn btn-primary">Fetch Service Requests</button>

            <div v-if="requests.length > 0" class="mt-4">
                <h3>Service Requests</h3>
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Service Name</th>
                            <th>Customer Name</th>
                            <th>Booking Date</th>
                            <th>Booking Time</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="request in requests" :key="request.id">
                            <td>{{ request.service_name }}</td>
                            <td>{{ request.customer_name }}</td>
                            <td>{{ request.booking_date }}</td>
                            <td>{{ request.booking_time }}</td>
                            <td>{{ request.status }}</td>
                        </tr>
                    </tbody>
                </table>

                <button @click="exportCsv" class="btn btn-success">Export as CSV</button>
            </div>

            <div v-if="csvFiles.length > 0" class="mt-4">
                <h3>Available Downloads</h3>
                <ul>
                    <li v-for="file in csvFiles" :key="file">
                        <button @click="downloadCsv(file)" class="btn btn-link">{{ file }}</button>
                    </li>
                </ul>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            professionalId: '',
            requests: [],
            csvFiles: []
        };
    },
    methods: {
        async fetchRequests() {
            if (!this.professionalId) {
                alert("Please enter a Professional ID");
                return;
            }

            try {
                const response = await axios.get(`/api/admin/professional-requests/${this.professionalId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                this.requests = response.data.requests;
            } catch (error) {
                console.error("Error fetching service requests:", error);
                alert("Error fetching data. Check the console for details.");
            }
        },
        async exportCsv() {
            try {
                await axios.post(`/api/admin/export/${this.professionalId}`, {}, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                alert("CSV export started. Please check the available downloads when ready.");
                this.fetchAvailableCsvFiles();
            } catch (error) {
                console.error("Error exporting CSV:", error);
                alert("Error exporting data. Check the console for details.");
            }
        },
        async fetchAvailableCsvFiles() {
            try {
                const response = await axios.get('/api/admin/reports/list', {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                this.csvFiles = response.data.csv_files;
            } catch (error) {
                console.error("Error fetching CSV file list:", error);
                alert("Error fetching available downloads.");
            }
        },
        async downloadCsv(filename) {
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get(`/api/admin/reports/download/${filename}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob'
                });

                // Create a Blob and trigger the download
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", filename);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (error) {
                console.error("Error downloading file:", error);
                alert("Error downloading file. Check the console for details.");
            }
        },
        logout() {
            axios.post('/api/logout', {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(() => {
                    localStorage.clear();
                    window.location.href = "/#/login";
                })
                .catch(error => console.error(error));
        }
    },
    mounted() {
        this.fetchAvailableCsvFiles();
    }
};
